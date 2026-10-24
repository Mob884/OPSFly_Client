/**
 * NoteCard — displays a single saved note as a tappable card.
 *
 * @param {{
 *   note: { _id: string, transcript: string, source: string, createdAt: string },
 *   preview?: boolean,   // true = show 40-char preview; false = show full text
 *   onClick?: () => void
 * }} props
 */
export default function NoteCard({ note, preview = true, onClick }) {
  const { transcript, source, createdAt } = note;

  // Format time as HH:MM AM/PM
  const time = new Date(createdAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  const displayText = preview
    ? transcript.slice(0, 40) + (transcript.length > 40 ? '…' : '')
    : transcript;

  const icon = source === 'text' ? '✏️' : '🎙️';

  return (
    <div
      className="note-card"
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
      aria-label={`Note at ${time}: ${displayText}`}
    >
      <div className="note-card-icon" aria-hidden="true">{icon}</div>

      <div className="note-card-body">
        <div className="note-card-time">{time}</div>
        <div className="note-card-preview" style={!preview ? { whiteSpace: 'normal', overflow: 'visible' } : {}}>
          {displayText}
        </div>
      </div>

      <div className="note-card-source">{source === 'text' ? 'typed' : 'voice'}</div>
    </div>
  );
}
