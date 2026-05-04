"use client";
import 'regenerator-runtime/runtime';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import { Mic, Square, Loader2 } from 'lucide-react';
import Header from '@/src/components/Header';
import { analyzeNote } from '@/src/services/api';

export default function RecordingPage() {
  const router = useRouter();
  const [phase, setPhase] = useState('idle'); // idle | recording | processing | error
  const [elapsed, setElapsed] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [analysisStatus, setAnalysisStatus] = useState('');

  const { transcript, listening, resetTranscript, browserSupportsSpeechRecognition } = useSpeechRecognition();

  // Timer
  useEffect(() => {
    let interval = null;
    if (phase === 'recording') {
      interval = setInterval(() => setElapsed(p => p + 1), 1000);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [phase]);

  // Stop mic on unmount
  useEffect(() => {
    return () => SpeechRecognition.stopListening();
  }, []);

  const handleStart = async () => {
    if (!browserSupportsSpeechRecognition) {
      setPhase('error');
      setErrorMsg("Your browser doesn't support speech recognition.");
      return;
    }
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      resetTranscript();
      setElapsed(0);
      setPhase('recording');
      SpeechRecognition.startListening({ continuous: true, language: 'en-US' });
    } catch (err) {
      setPhase('error');
      setErrorMsg("Mic access denied. Please allow mic in browser settings.");
    }
  };

  const handleStop = async () => {
    setPhase('processing');
    setAnalysisStatus('Analyzing note...');
    SpeechRecognition.stopListening();
    const finalTranscript = transcript || "(No speech detected.)";
    try {
      const result = await analyzeNote(finalTranscript);
      const data = { transcript: finalTranscript, source: 'voice', issues: result.issues, analyzedAt: new Date() };
      sessionStorage.setItem('lastAnalysis', JSON.stringify(data));
      router.push('/analysis');
    } catch (err) {
      const data = { transcript: finalTranscript, source: 'voice', issues: [] };
      sessionStorage.setItem('lastAnalysis', JSON.stringify(data));
      router.push('/analysis');
    }
  };

  const formatTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <>
      <Header showBack title="Recording" />
      <main className="recording-page">
        {/* Status */}
        {phase === 'processing' ? (
          <div className="recording-status">
            <Loader2 size={18} className="spinner" color="var(--primary)" />
            {analysisStatus || 'Processing...'}
          </div>
        ) : phase === 'idle' ? (
          <div className="recording-status">
            <div className="recording-dot" style={{ background: 'var(--text-muted)', boxShadow: 'none', animation: 'none' }} />
            Ready to Record
          </div>
        ) : (
          <div className="recording-status">
            <div className="recording-dot" />
            {listening ? 'Recording...' : 'Mic Active'}
          </div>
        )}

        {/* Timer */}
        <div className="recording-timer" style={{ opacity: phase === 'idle' ? 0.3 : 1 }}>
          {formatTime(elapsed)}
        </div>

        {/* Error */}
        {phase === 'error' && (
          <div style={{ color: 'var(--staffing)', marginBottom: '24px', textAlign: 'center', fontSize: '0.9rem', padding: '0 24px' }}>
            {errorMsg}
          </div>
        )}

        {/* Mic / Stop / Loading button */}
        {phase === 'idle' ? (
          <button className="stop-btn pulse" onClick={handleStart}
            style={{ background: 'var(--primary)', border: 'none', position: 'relative' }}>
            <Mic size={32} color="#fff" />
          </button>
        ) : phase === 'recording' ? (
          <button className="stop-btn" onClick={handleStop}>
            <Square size={28} fill="#fff" color="#fff" />
          </button>
        ) : phase === 'error' ? (
          <button className="stop-btn" onClick={() => { setPhase('idle'); setElapsed(0); }}
            style={{ background: 'var(--primary)', border: 'none' }}>
            <Mic size={32} color="#fff" />
          </button>
        ) : (
          <button className="stop-btn loading" disabled>
            <Loader2 size={32} className="spinner" color="#fff" />
          </button>
        )}

        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '20px', textAlign: 'center' }}>
          {phase === 'idle' ? 'Tap mic to start' :
           phase === 'recording' ? 'Tap to stop & analyze' :
           phase === 'error' ? 'Tap to try again' : 'Analyzing...'}
        </p>

        {/* Live transcript preview */}
        {(transcript.length > 0 || phase === 'recording') && (
          <div style={{
            marginTop: '40px', padding: '16px 24px',
            background: 'var(--bg-card)', borderRadius: '16px',
            border: '1px solid var(--border)',
            maxWidth: '360px', width: '100%',
            fontSize: '0.9rem', color: 'var(--text-secondary)',
            lineHeight: 1.6, textAlign: 'center', fontStyle: 'italic'
          }}>
            {transcript.length > 0 ? `"${transcript}"` : 'Listening...'}
          </div>
        )}
      </main>
    </>
  );
}
