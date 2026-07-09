import { useState } from "react";
import type { Poll, Question } from "../types";

export function InteractionPanel({
  role,
  questions,
  polls,
  reactions,
  onAsk,
  onUpvote,
  onHighlight,
  onVote,
  onEndPoll,
  onStartPoll,
  onReact,
}: {
  role: "presenter" | "attendee";
  questions: Question[];
  polls: Poll[];
  reactions: Record<string, number>;
  onAsk: (author: string, text: string) => void;
  onUpvote: (id: string) => void;
  onHighlight: (id: string) => void;
  onVote: (pollId: string, optionId: string) => void;
  onEndPoll: (pollId: string) => void;
  onStartPoll: (question: string, options: string[]) => void;
  onReact: (emoji: string) => void;
}) {
  const [author, setAuthor] = useState("");
  const [questionText, setQuestionText] = useState("");
  const [pollQuestion, setPollQuestion] = useState("How are you feeling about this update?");
  const [pollOptions, setPollOptions] = useState("Great, Good, Neutral, Concerned");

  const sortedQuestions = [...questions].sort((a, b) => b.upvotes - a.upvotes);
  const activePoll = [...polls].reverse().find((p) => p.active);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Reactions</h3>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          {["👍", "👏", "🎉", "❤️", "🤔"].map((emoji) => (
            <button key={emoji} className="secondary" onClick={() => onReact(emoji)}>
              {emoji} {reactions[emoji] ? `(${reactions[emoji]})` : ""}
            </button>
          ))}
        </div>
      </div>

      {activePoll && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>{activePoll.question}</h3>
          {activePoll.options.map((option) => {
            const total = activePoll.options.reduce((sum, o) => sum + o.votes, 0);
            const pct = total ? Math.round((option.votes / total) * 100) : 0;
            return (
              <div key={option.id} style={{ marginBottom: "0.75rem" }}>
                <button
                  className="secondary"
                  style={{ width: "100%", textAlign: "left" }}
                  onClick={() => onVote(activePoll.id, option.id)}
                  disabled={role === "presenter"}
                >
                  {option.label} — {option.votes} ({pct}%)
                </button>
              </div>
            );
          })}
          {role === "presenter" && (
            <button onClick={() => onEndPoll(activePoll.id)}>End poll</button>
          )}
        </div>
      )}

      {role === "presenter" && !activePoll && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Start a poll</h3>
          <input value={pollQuestion} onChange={(e) => setPollQuestion(e.target.value)} />
          <input
            style={{ marginTop: "0.5rem" }}
            value={pollOptions}
            onChange={(e) => setPollOptions(e.target.value)}
            placeholder="Comma-separated options"
          />
          <button
            style={{ marginTop: "0.75rem" }}
            onClick={() =>
              onStartPoll(
                pollQuestion,
                pollOptions.split(",").map((o) => o.trim()).filter(Boolean)
              )
            }
          >
            Launch poll
          </button>
        </div>
      )}

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Q&A</h3>
        {role === "attendee" && (
          <>
            <input
              placeholder="Your name (optional)"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              style={{ marginBottom: "0.5rem" }}
            />
            <textarea
              rows={3}
              placeholder="Ask a question…"
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
            />
            <button
              style={{ marginTop: "0.5rem" }}
              onClick={() => {
                onAsk(author || "Anonymous", questionText);
                setQuestionText("");
              }}
            >
              Submit question
            </button>
          </>
        )}

        <div style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {sortedQuestions.length === 0 && <p className="muted">No questions yet.</p>}
          {sortedQuestions.map((q) => (
            <div
              key={q.id}
              className="card"
              style={{
                padding: "0.75rem",
                background: q.highlighted ? "#1e3a5f" : "var(--surface-2)",
              }}
            >
              <strong>{q.author}</strong>
              <p style={{ margin: "0.35rem 0" }}>{q.text}</p>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button className="secondary" onClick={() => onUpvote(q.id)}>
                  ▲ {q.upvotes}
                </button>
                {role === "presenter" && (
                  <button className="secondary" onClick={() => onHighlight(q.id)}>
                    {q.highlighted ? "Unhighlight" : "Highlight"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
