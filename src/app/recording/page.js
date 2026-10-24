"use client";
import 'regenerator-runtime/runtime';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import { Mic, Square, Loader2, AlertCircle } from 'lucide-react';
import Header from '@/src/components/Header';
import { analyzeNote } from '@/src/services/api';

export default function RecordingPage() {
  const router = useRouter();
  const [phase, setPhase] = useState('idle'); // idle | recording | processing | error
  const [elapsed, setElapsed] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [analysisStatus, setAnalysisStatus] = useState('');
  const timerRef = useRef(null);

  const { transcript, listening, resetTranscript, browserSupportsSpeechRecognition } = useSpeechRecognition();

  // Timer
  useEffect(() => {
    if (phase === 'recording') {
      timerRef.current = setInterval(() => setElapsed(p => p + 1), 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [phase]);

  // Stop mic on unmount
  useEffect(() => {
    return () => SpeechRecognition.stopListening();
  }, []);

  const handleStart = async () => {
    // Check browser support first
    if (!browserSupportsSpeechRecognition) {
      setPhase('error');
      setErrorMsg("Your browser doesn't support speech recognition. Please use Chrome.");
      return;
    }

    setPhase('recording');
    resetTranscript();
    setElapsed(0);

    try {
      // Let react-speech-recognition handle its own mic permission
      // Don't call getUserMedia separately — it causes double permission prompts
      await SpeechRecognition.startListening({ continuous: true, language: 'en-US' });
    } catch (err) {
      console.error('Mic error:', err);
      setPhase('error');
      setErrorMsg("Microphone access denied. Please allow mic access and try again.");
    }
  };

  const handleStop = async () => {
    SpeechRecognition.stopListening();
    setPhase('processing');
    setAnalysisStatus('Analyzing note...');

    const finalTranscript = transcript?.trim() || "(No speech detected.)";
    try {
      const result = await analyzeNote(finalTranscript);
      const data = { transcript: finalTranscript, source: 'voice', issues: result.issues || [], analyzedAt: new Date() };
      sessionStorage.setItem('lastAnalysis', JSON.stringify(data));
      router.push('/analysis');
    } catch (err) {
      console.error('Analysis failed:', err);
      const data = { transcript: finalTranscript, source: 'voice', issues: [] };
      sessionStorage.setItem('lastAnalysis', JSON.stringify(data));
      router.push('/analysis');
    }
  };

  const handleRetry = () => {
    setPhase('idle');
    setElapsed(0);
    setErrorMsg('');
  };

  const formatTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <>
      <Header showBack title="Recording" />
      <main className="recording-page">

        {/* ── Status indicator ── */}
        {phase === 'idle' && (
          <div className="recording-status">
            <div className="recording-dot" style={{ background: 'var(--text-muted)', boxShadow: 'none', animation: 'none' }} />
            Ready to Record
          </div>
        )}
        {phase === 'recording' && (
          <div className="recording-status">
            <div className="recording-dot" />
            {listening ? 'Recording...' : 'Starting...'}
          </div>
        )}
        {phase === 'processing' && (
          <div className="recording-status">
            <Loader2 size={16} className="spinner" color="var(--primary)" />
            {analysisStatus || 'Processing...'}
          </div>
        )}
        {phase === 'error' && (
          <div className="recording-status" style={{ color: 'var(--staffing)', flexDirection: 'column', gap: '6px', textAlign: 'center' }}>
            <AlertCircle size={18} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* ── Timer ── */}
        <div className="recording-timer" style={{ opacity: phase === 'idle' ? 0.25 : 1 }}>
          {formatTime(elapsed)}
        </div>

        {/* ── Action button ── */}
        {phase === 'idle' && (
          <button className="stop-btn" onClick={handleStart}
            style={{ background: 'var(--primary)', boxShadow: '0 0 0 12px rgba(29,123,255,0.15), 0 8px 24px rgba(29,123,255,0.5)', position: 'relative' }}>
            <Mic size={32} color="#fff" />
          </button>
        )}
        {phase === 'recording' && (
          <button className="stop-btn" onClick={handleStop}>
            <Square size={28} fill="#fff" color="#fff" />
          </button>
        )}
        {phase === 'processing' && (
          <button className="stop-btn loading" disabled>
            <Loader2 size={32} className="spinner" color="#fff" />
          </button>
        )}
        {phase === 'error' && (
          <button className="stop-btn" onClick={handleRetry}
            style={{ background: 'var(--primary)', boxShadow: '0 0 0 12px rgba(29,123,255,0.15), 0 8px 24px rgba(29,123,255,0.5)' }}>
            <Mic size={32} color="#fff" />
          </button>
        )}

        {/* ── Hint text ── */}
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '20px', textAlign: 'center' }}>
          {phase === 'idle' ? 'Tap mic to start recording' :
           phase === 'recording' ? 'Tap to stop & analyze' :
           phase === 'error' ? 'Tap mic to try again' :
           'Analyzing your note...'}
        </p>

        {/* ── Live transcript preview ── */}
        {phase === 'recording' && (
          <div style={{
            marginTop: '40px', padding: '16px 20px',
            background: 'var(--bg-card)', borderRadius: '16px',
            border: '1px solid var(--border)',
            maxWidth: '340px', width: '100%',
            fontSize: '0.875rem', color: 'var(--text-secondary)',
            lineHeight: 1.6, textAlign: 'center', fontStyle: 'italic'
          }}>
            {transcript?.length > 0 ? `"${transcript}"` : 'Listening...'}
          </div>
        )}
      </main>
    </>
  );
}
