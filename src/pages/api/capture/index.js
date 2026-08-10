import fs from 'fs';
import os from 'os';
import path from 'path';
import axios from 'axios';
import connectDB from '@/lib/mongodb';
import User from '@/lib/User';
import Note from '@/lib/Note';
import CaptureEvent from '@/lib/CaptureEvent';
import TenantMemory from '@/lib/TenantMemory';
import BusinessDNAEntry from '@/lib/BusinessDNAEntry';
import { authMiddleware } from '@/lib/auth';
import { analyzeTranscript } from '@/lib/analyzer';
import { transcribeAudio } from '@/lib/whisper';
import { getSignedFileUrl, hasAwsCredentials } from '@/lib/storage';

// Downloads the S3 object at fileKey to a local temp file so the existing
// Whisper service (which reads from a local filePath) can transcribe it.
async function downloadToTempFile(fileKey) {
  const signedUrl = await getSignedFileUrl(fileKey, 300);
  const response = await axios.get(signedUrl, { responseType: 'arraybuffer' });
  const tempPath = path.join(os.tmpdir(), `capture-${Date.now()}-${path.basename(fileKey)}`);
  fs.writeFileSync(tempPath, response.data);
  return tempPath;
}

// POST /api/capture
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  await connectDB();
  const decoded = await authMiddleware(req, res);
  if (!decoded) return;

  const user = await User.findById(decoded.userId);
  if (!user || user.isActive === false || user.deleted === true) {
    return res.status(401).json({ error: 'User not found or deactivated' });
  }

  const { deviceType, captureType, rawPayload = {} } = req.body;

  if (!deviceType || !captureType) {
    return res.status(400).json({ error: 'deviceType and captureType are required' });
  }

  const captureEvent = await CaptureEvent.create({
    organizationId: user.organizationId,
    locationId: req.headers['x-location-id'] || null,
    userId: user._id,
    deviceType,
    captureType,
    rawPayload,
    processingStatus: 'pending',
  });

  try {
    let transcript = null;
    let source = 'text';

    if (captureType === 'text' && rawPayload.textContent) {
      transcript = rawPayload.textContent;
      source = 'text';
    } else if (captureType === 'voice' && rawPayload.audioFileKey) {
      source = 'voice';
      captureEvent.processingStatus = 'transcribing';
      await captureEvent.save();

      if (!hasAwsCredentials) {
        throw new Error('Cannot transcribe: AWS S3 is not configured (mock storage has no real audio file to download).');
      }

      const tempPath = await downloadToTempFile(rawPayload.audioFileKey);
      try {
        transcript = await transcribeAudio(tempPath, 'audio/m4a');
      } finally {
        fs.unlink(tempPath, () => {});
      }
    } else {
      throw new Error('rawPayload must include textContent for captureType "text" or audioFileKey for captureType "voice"');
    }

    captureEvent.processingStatus = 'analyzing';
    await captureEvent.save();

    const analysis = await analyzeTranscript(transcript, user.organizationId);

    const note = await Note.create({
      transcript,
      source,
      issues: analysis.issues || [],
      analyzedAt: new Date(),
      userId: user._id,
      locationId: captureEvent.locationId,
      organizationId: user.organizationId,
      captureSource: deviceType,
    });

    // Create TenantMemory from saved note (Vault 1) — kept consistent with
    // /api/notes/save's flow, so every note-creation path builds Vault 1
    // memory, not just the legacy save route.
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
      // Don't fail the capture if memory creation fails
      console.error('TenantMemory creation failed:', e.message);
    }

    // Auto-grow Business DNA from detected observations (same as notes/save).
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

    captureEvent.processingStatus = 'complete';
    captureEvent.resultNoteId = note._id;
    captureEvent.processedAt = new Date();
    await captureEvent.save();

    return res.status(201).json({
      captureEventId: captureEvent._id,
      noteId: note._id,
      status: 'complete',
    });
  } catch (error) {
    captureEvent.processingStatus = 'failed';
    await captureEvent.save();
    return res.status(500).json({
      captureEventId: captureEvent._id,
      status: 'failed',
      error: error.message,
    });
  }
}
