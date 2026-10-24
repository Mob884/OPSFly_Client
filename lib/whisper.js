import OpenAI from 'openai';
import fs from 'fs';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Transcribes an audio file using the OpenAI Whisper API.
 *
 * @param {string} filePath  Absolute path to the audio file on disk.
 * @param {string} mimeType  MIME type of the file (e.g. 'audio/webm', 'audio/mp4').
 * @returns {Promise<string>} The transcribed text.
 */
export async function transcribeAudio(filePath, mimeType) {
  const fileStream = fs.createReadStream(filePath);

  // Determine filename extension so Whisper identifies the format correctly
  const ext = mimeType === 'audio/mp4' ? 'mp4'
    : mimeType === 'audio/mpeg' ? 'mp3'
    : mimeType === 'audio/ogg' ? 'ogg'
    : 'webm'; // default for Chrome/Android

  const response = await openai.audio.transcriptions.create({
    file: fileStream,
    model: 'whisper-1',
    response_format: 'text',
  });

  // openai SDK returns the transcript string directly when response_format is 'text'
  return typeof response === 'string' ? response : response.text;
}
