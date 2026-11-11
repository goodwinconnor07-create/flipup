import { useEffect, useRef, useState } from 'react';
import { encodeResearchShare, encodeResearchPayload } from '../research/share';
import { createResearchReviewPacket } from '../research/reviewPacket';
import type { ResearchReport } from '../research/protocol';

/** Prepare before the tap so iPhone clipboard access retains the user gesture. */
export function ResearchCopy({ report, full = false }: { report: ResearchReport; full?: boolean }) {
  const [showFull, setShowFull] = useState(false);
  const [parts, setParts] = useState<string[]>([]),
    [part, setPart] = useState(0),
    [error, setError] = useState(''),
    [message, setMessage] = useState('');
  const text = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    let live = true;
    setParts([]);
    setPart(0);
    setError('');
    setMessage('');
    (full ? encodeResearchShare(report) : encodeResearchPayload(createResearchReviewPacket(report), report.hands.length))
      .then((p) => {
        if (live) setParts(p);
      })
      .catch((e) => {
        if (live) setError((e as Error).message);
      });
    return () => {
      live = false;
    };
  }, [report, full]);
  const selectText = () => {
    text.current?.focus();
    text.current?.select();
    if (text.current) text.current.setSelectionRange(0, text.current.value.length);
  };
  const copy = () => {
    if (!navigator.clipboard?.writeText) {
      selectText();
      setMessage('Press and hold the selected text, then choose Copy.');
      return;
    }
    void navigator.clipboard
      .writeText(parts[part])
      .then(() =>
        setMessage(
          `Copied part ${part + 1} of ${parts.length}. Paste it into the chat${parts.length > 1 ? ', then return for the next part' : ''}.`,
        ),
      )
      .catch(() => {
        selectText();
        setMessage('Clipboard access was unavailable. Press and hold the selected text, then choose Copy.');
      });
  };
  return (
    <section className="research-feedback" aria-label="Copy research for chat">
      <h2>Paste your research into chat</h2>
      <p>
        {full
          ? 'This larger copy preserves private checkpoints for exact replay. Paste all numbered parts.'
          : `Copy and paste all ${report.hands.length} hands, your notes and every bot’s decision explanation into the chat. The smaller review copy leaves out private replay checkpoints.`}
      </p>
      {error && <p role="alert">{error}</p>}
      {!parts.length && !error && <p role="status">Preparing your review packet…</p>}
      {parts.length > 0 && (
        <>
          {parts.length > 1 && (
            <label className="research-field">
              Review packet part
              <select
                value={part}
                onChange={(e) => {
                  setPart(Number(e.target.value));
                  setMessage('');
                }}
              >
                {parts.map((_, i) => (
                  <option value={i} key={i}>
                    Part {i + 1} of {parts.length}
                  </option>
                ))}
              </select>
            </label>
          )}
          <button className="btn btn-blue" onClick={copy}>
            {parts.length === 1
              ? full
                ? 'Copy full replay packet'
                : 'Copy review packet'
              : `Copy ${full ? 'replay ' : ''}part ${part + 1} of ${parts.length}`}
          </button>
          {message && <p role="status">{message}</p>}
          <label className="research-field">
            Copyable research text
            <textarea ref={text} readOnly rows={3} value={parts[part]} onFocus={(e) => e.currentTarget.select()} />
          </label>
          {parts.length > 1 && (
            <div className="research-buttons">
              <button
                className="btn btn-ghost"
                disabled={part === 0}
                onClick={() => {
                  setPart(part - 1);
                  setMessage('');
                }}
              >
                Previous part
              </button>
              <button
                className="btn btn-ghost"
                disabled={part === parts.length - 1}
                onClick={() => {
                  setPart(part + 1);
                  setMessage('');
                }}
              >
                Next part
              </button>
            </div>
          )}
          <p className="muted">
            Paste every numbered part from this copy, even if they look like encoded text. The packet contains private hand data; share it
            only with your reviewer. Your access key is excluded.
          </p>
        </>
      )}
      {!full && (
        <details onToggle={(e) => setShowFull(e.currentTarget.open)}>
          <summary>Full data for exact replay (larger)</summary>
          {showFull && <ResearchCopy report={report} full />}
        </details>
      )}
    </section>
  );
}
