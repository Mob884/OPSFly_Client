/**
 * MicButton — the central recording control.
 *
 * States:
 *   idle      → blue gradient, mic emoji, tap to start recording
 *   recording → red/pulse animation, tap to stop
 *   loading   → spinner, waiting for transcription
 *
 * @param {{ state: 'idle'|'recording'|'loading', onClick: () => void }} props
 */
export default function MicButton({ state = 'idle', onClick }) {
  const isRecording = state === 'recording';
  const isLoading   = state === 'loading';

  const ariaLabel = isRecording
    ? 'Stop recording'
    : isLoading
    ? 'Processing audio…'
    : 'Start recording a voice note';

  return (
    <div className={`mic-wrapper ${isRecording ? 'recording' : ''}`}>
      {/* Animated pulse rings (visible only during recording) */}
      <div className="mic-ring mic-ring-1" aria-hidden="true" />
      <div className="mic-ring mic-ring-2" aria-hidden="true" />
      <div className="mic-ring mic-ring-3" aria-hidden="true" />

      <button
        id="mic-button"
        className={`mic-btn ${isRecording ? 'recording' : ''} ${isLoading ? 'loading' : ''}`}
        onClick={!isLoading ? onClick : undefined}
        disabled={isLoading}
        aria-label={ariaLabel}
      >
        {isLoading ? (
          <div className="spinner" style={{ width: 28, height: 28, borderWidth: 3 }} />
        ) : isRecording ? (
          '⏹'
        ) : (
          '🎙️'
        )}
      </button>
    </div>
  );
}
