import connectDB from '@/lib/mongodb';
import { requireWatchDevice } from '@/lib/watchAuth';
import { analyzeTranscript } from '@/lib/analyzer';
import { saveCapturedNote } from '@/lib/noteCapture';

/**
 * POST /api/watch/capture   { transcript }      (Authorization: Bearer <watch token>)
 * M5: a note dictated on the Apple Watch. It goes through the SAME pipeline as a
 * phone note (AI analysis, Vault 1 + Pinecone, Business DNA link, corrective
 * action chain, tasks, notifications); only captureSource differs. The watch has
 * no review screen, so analysis and save happen in one call and a short summary
 * comes back for the watch to show.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    await connectDB();
    const auth = await requireWatchDevice(req, res);
    if (!auth) return;
    const { user, locationId } = auth;

    const transcript = typeof req.body?.transcript === 'string' ? req.body.transcript.trim().slice(0, 4000) : '';
    if (!transcript) return res.status(400).json({ error: 'transcript is required' });

    const analysis = await analyzeTranscript(transcript, user.organizationId);
    const result = await saveCapturedNote({
      decoded: { userId: user._id },
      access: { selectedLocationId: locationId, organizationId: user.organizationId, user },
      body: {
        transcript,
        source: 'voice',
        captureSource: 'apple_watch',
        issues: analysis.issues || [],
        analyzedAt: new Date(),
      },
    });
    if (result.status !== 201) return res.status(result.status).json(result.body);

    return res.status(201).json({
      success: true,
      summary: {
        issues: (result.body.note.issues || []).map((i) => ({ type: i.type, severity: i.severity, quote: i.quote })),
        tasks: (result.body.tasks || []).map((t) => t.title),
        recall: result.body.recall?.recallSummary || null,
        aiAvailable: !analysis.error,
      },
    });
  } catch (error) {
    console.error('[POST /api/watch/capture]', error);
    return res.status(500).json({ error: 'Could not save the note', detail: error.message });
  }
}
