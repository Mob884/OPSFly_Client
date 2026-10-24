import multer from 'multer';
import OpenAI from 'openai';
import fs from 'fs';
import { analyzeTranscript } from '@/lib/analyzer';
import connectDB from '@/lib/mongodb';
import User from '@/lib/User';
import { authMiddleware } from '@/lib/auth';

const upload = multer({ dest: '/tmp/' });

// Helper to run express middleware in Next.js API routes
function runMiddleware(req, res, fn) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });
}

export const config = {
  api: {
    bodyParser: false, // Disables body parsing to allow multer to parse multipart data
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    await connectDB();
    const decoded = await authMiddleware(req, res);
    if (!decoded) return;

    // Execute multer file parser
    await runMiddleware(req, res, upload.single('audio'));

    if (!req.file) {
      return res.status(400).json({ error: 'No audio file uploaded' });
    }

        const audioPath = req.file.path;
    // Bounded timeout + our own retry loop (each attempt opens a fresh
    // connection) instead of the SDK's default 10-minute timeout/backoff —
    // serverless functions can hand a request a stale keep-alive socket from
    // a previous (frozen) invocation, and a fresh attempt reliably recovers.
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 25000, maxRetries: 0 });
    const originalName = req.file.originalname || 'audio.m4a';

    let transcript = '';
    let lastError = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const fileObject = await OpenAI.toFile(fs.createReadStream(audioPath), originalName);
        const transcription = await openai.audio.transcriptions.create({
          file: fileObject,
          model: 'whisper-1',
        });
        transcript = transcription.text;
        lastError = null;
        console.log(`[Transcribe API] Whisper succeeded on attempt ${attempt}:`, transcript);
        break;
      } catch (whisperError) {
        lastError = whisperError;
        console.warn(`[Transcribe API] Whisper attempt ${attempt} failed:`, whisperError.status, whisperError.message);
      }
    }

    if (lastError) {
      // Do NOT fabricate a transcript on failure — that silently creates fake
      // notes/tasks from unrelated canned text. Surface the real failure instead.
      console.error('[Transcribe API] OpenAI Whisper failed after retries:', lastError.status, lastError.message);
      try { fs.unlinkSync(audioPath); } catch (e) { /* best effort */ }
      return res.status(502).json({
        error: 'Transcription failed. Please try again.',
        detail: lastError.message,
      });
    }

    // Trigger AI analysis automatically on transcript
    const user = await User.findById(decoded.userId);
    const analysis = await analyzeTranscript(transcript, user?.organizationId);

    // Clean up temporary audio file
    try {
      fs.unlinkSync(audioPath);
    } catch (e) {
      console.warn('Failed to delete temp file', e);
    }

    return res.status(200).json({
      transcript,
      issues: analysis.issues || []
    });
  } catch (error) {
    console.error('[Transcribe API Error]', error);
    return res.status(500).json({ error: 'Transcription failed', detail: error.message });
  }
}
