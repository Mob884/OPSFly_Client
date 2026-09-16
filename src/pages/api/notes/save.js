import connectDB from '@/lib/mongodb';
import Note from '@/lib/Note';
import Task from '@/lib/Task';
import User from '@/lib/User';
import Location from '@/lib/Location';
import Notification from '@/lib/Notification';
import TenantMemory from '@/lib/TenantMemory';
import BusinessDNAEntry from '@/lib/BusinessDNAEntry';
import WalkSession from '@/lib/WalkSession';
import { authMiddleware } from '@/lib/auth';
import { verifyLocationAccess } from '@/lib/scopeByLocation';
import { createCorrectiveAction } from '@/lib/correctiveActions';

/**
 * POST /api/notes/save
 * Saves the note, then auto-creates a Task for each detected issue.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  try {
    await connectDB();

    const decoded = await authMiddleware(req, res);
    if (!decoded) return;

    const access = await verifyLocationAccess(req, res, decoded);
    if (!access) return;

    const { selectedLocationId, organizationId, user } = access;

    // Block note creation if location is inactive or soft-deleted
    const activeLocation = await Location.findById(selectedLocationId);
    if (!activeLocation || activeLocation.deleted || activeLocation.isActive === false) {
      return res.status(403).json({ error: 'This location is inactive and cannot accept new notes.' });
    }

    const { transcript, source, issues = [], analyzedAt } = req.body;

    if (!transcript?.trim()) {
      return res.status(400).json({ error: 'transcript is required' });
    }

    // Tag this note as a walk note if the manager has an active Four Corner
    // Walk session at this location.
    let activeWalk = null;
    try {
      activeWalk = await WalkSession.findOne({
        managerId: decoded.userId,
        locationId: selectedLocationId,
        status: 'active',
      });
      if (activeWalk && activeWalk.timeoutAt && activeWalk.timeoutAt < new Date()) {
        activeWalk.status = 'timed_out';
        activeWalk.endedAt = activeWalk.timeoutAt;
        await activeWalk.save();
        activeWalk = null;
      }
    } catch (e) {
      console.error('Failed to check active walk session', e);
    }

    // 1. Save the note with the creator's userId, locationId, organizationId
    const note = await Note.create({
      transcript: transcript.trim(),
      source: source || 'voice',
      issues,
      analyzedAt: analyzedAt || new Date(),
      userId: decoded.userId,
      locationId: selectedLocationId,
      organizationId: organizationId,
      walkSessionId: activeWalk?._id || null,
      isWalkNote: !!activeWalk,
    });

    if (activeWalk) {
      try {
        activeWalk.noteIds.push(note._id);
        activeWalk.noteCount = (activeWalk.noteCount || 0) + 1;
        await activeWalk.save();
      } catch (e) {
        console.error('Failed to tag walk session with new note', e);
      }
    }

    // Create TenantMemory from saved note (Vault 1)
    try {
      const memoryContent = `${note.transcript}. Issues detected: ${
        (note.issues || []).map((i) => `${i.categoryKey || i.type}: ${i.quote}`).join(', ')
      }`;

      await TenantMemory.create({
        organizationId: note.organizationId,
        locationId: note.locationId,
        memoryType: 'observation',
        content: memoryContent,
        metadata: {
          sourceNoteId: note._id,
          captureSource: note.captureSource,
          tags: (note.issues || []).map((i) => i.categoryKey || i.type),
        },
      });
    } catch (e) {
      // Don't fail note save if memory creation fails
      console.error('TenantMemory creation failed:', e.message);
    }

    // Auto-grow Business DNA: every detected observation becomes a
    // BusinessDNAEntry, so the knowledge base grows with each voice note.
    try {
      if (note.issues && note.issues.length > 0) {
        for (const issue of note.issues) {
          await BusinessDNAEntry.create({
            organizationId: note.organizationId,
            locationId: note.locationId,
            entryType: 'observation',
            title: `${issue.categoryKey || issue.type || 'general'} observation`,
            content: issue.quote || issue.suggestedTask || note.transcript,
            sourceType: 'voice_note',
            sourceId: note._id,
            tags: [issue.categoryKey || issue.type, issue.severityKey || issue.severity].filter(Boolean),
          });
        }
      }
    } catch (e) {
      console.error('BusinessDNAEntry auto-creation failed:', e.message);
    }

    // Auto-track corrective actions for anything serious enough to need
    // follow-through — not every note, only high severity or maintenance
    // issues.
    try {
      if (note.issues && note.issues.length > 0) {
        for (const issue of note.issues) {
          const isHighSeverity = (issue.severityKey || issue.severity || '').toLowerCase() === 'high';
          const isMaintenance = (issue.categoryKey || issue.type || '').toLowerCase().includes('maint');
          if (!isHighSeverity && !isMaintenance) continue;

          await createCorrectiveAction({
            organizationId: note.organizationId,
            locationId: note.locationId,
            sourceNoteId: note._id,
            sourceQuote: issue.quote,
            sourceTimestamp: note.analyzedAt || note.createdAt,
            sourceManagerId: decoded.userId,
            assetId: issue.assetId,
            vendorId: issue.vendorId,
            isIncident: (issue.categoryKey || '').toLowerCase() === 'safety' || (issue.categoryKey || '').toLowerCase() === 'incident',
          });
        }
      }
    } catch (e) {
      console.error('CorrectiveAction auto-creation failed:', e.message);
    }

    // Trigger notification: note_added
    try {
      const activeLocUsers = await User.find({
        locationIds: selectedLocationId,
        isActive: { $ne: false },
        deleted: { $ne: true },
        _id: { $ne: decoded.userId }
      });
      if (activeLocUsers.length > 0) {
        const notificationsToCreate = activeLocUsers.map(u => ({
          userId: u._id,
          type: 'note_added',
          message: `${user.name} added a note`,
          relatedNoteId: note._id,
        }));
        await Notification.insertMany(notificationsToCreate);

        // TRIGGER PUSH: notify GM/managers at that location
        try {
          const { sendPushNotification } = require('@/lib/pushNotifications');
          const managersToNotify = activeLocUsers.filter(u =>
            ['owner', 'district_manager', 'gm', 'agm', 'Manager'].includes(u.role)
          );
          for (const mgr of managersToNotify) {
            await sendPushNotification(
              mgr._id,
              'New Note Added',
              `${user.name} added a note at ${activeLocation.name}`,
              { relatedNoteId: note._id, type: 'note_added' }
            );
          }
        } catch (pushErr) {
          console.error('FCM push error for note_added:', pushErr);
        }
      }
    } catch (err) {
      console.error('Failed to create notifications for note', err);
    }

    // 2. Auto-create tasks from issues (if any) with the creator's userId, locationId, organizationId
    const createdTasks = [];
    if (issues.length > 0) {
      const dueDate = new Date();
      dueDate.setHours(23, 59, 0, 0);

      for (const issue of issues) {
        if (!issue.suggestedTask) continue; // skip if no task suggestion

        // Map AI severity → Task priority
        const priorityMap = { high: 'High', medium: 'Medium', low: 'Low' };
        const priority = priorityMap[issue.severity?.toLowerCase()] || 'Medium';

        const task = await Task.create({
          title: issue.suggestedTask,
          priority,
          sourceNoteId: note._id,
          sourceIssueType: issue.type,
          dueDate,
          userId: decoded.userId,
          locationId: selectedLocationId,
          organizationId: organizationId,
        });
        createdTasks.push(task);
      }
    }

    return res.status(201).json({ success: true, note, tasks: createdTasks });
  } catch (error) {
    console.error('[POST /api/notes/save]', error);
    return res.status(500).json({ error: 'Save failed', detail: error.message });
  }
}
