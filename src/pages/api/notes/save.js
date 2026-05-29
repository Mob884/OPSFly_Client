import connectDB from '@/lib/mongodb';
import Note from '@/lib/Note';
import Task from '@/lib/Task';
import { authMiddleware } from '@/lib/auth';

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

    const { transcript, source, issues = [], analyzedAt } = req.body;

    if (!transcript?.trim()) {
      return res.status(400).json({ error: 'transcript is required' });
    }

    // 1. Save the note with the creator's userId
    const note = await Note.create({
      transcript: transcript.trim(),
      source: source || 'voice',
      issues,
      analyzedAt: analyzedAt || new Date(),
      userId: decoded.userId,
    });

    // 2. Auto-create tasks from issues (if any) with the creator's userId
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
