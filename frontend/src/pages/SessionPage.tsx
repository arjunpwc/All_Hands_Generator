import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { InteractionPanel } from "../components/InteractionPanel";
import SlideViewer from "../components/SlideViewer";
import { useSessionSocket } from "../hooks/useSessionSocket";
import type { Session } from "../types";

export default function SessionPage() {
  const { sessionId = "" } = useParams();
  const [searchParams] = useSearchParams();
  const role = searchParams.get("role") === "presenter" ? "presenter" : "attendee";
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState("");
  const { connected, liveState, send } = useSessionSocket(sessionId, role);

  useEffect(() => {
    fetch(`/api/sessions/${sessionId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Session not found");
        return res.json();
      })
      .then(setSession)
      .catch(() => setError("Session not found"));
  }, [sessionId]);

  const currentSlide = useMemo(() => {
    if (!session) return undefined;
    const index = liveState.current_slide || 1;
    return session.slides.find((s) => s.index === index) || session.slides[0];
  }, [session, liveState.current_slide]);

  if (error) {
    return (
      <div className="container">
        <p>{error}</p>
        <Link to="/">Back home</Link>
      </div>
    );
  }

  if (!session) {
    return <div className="container">Loading session…</div>;
  }

  const slideCount = session.slide_count;
  const current = liveState.current_slide || 1;

  return (
    <div className="container">
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
        <div>
          <p className="muted" style={{ margin: 0 }}>
            {role === "presenter" ? "Presenter view" : "Attendee view"} · {connected ? "Live" : "Connecting…"}
          </p>
          <h1 style={{ margin: "0.25rem 0" }}>{session.title}</h1>
        </div>
        <Link to="/" className="muted">
          Home
        </Link>
      </header>

      <div className="grid-2" style={{ marginTop: "1.5rem" }}>
        <div>
          <SlideViewer sessionId={sessionId} slide={currentSlide} />

          {role === "presenter" && (
            <div style={{ display: "flex", gap: "0.75rem", marginTop: "1rem" }}>
              <button
                className="secondary"
                disabled={current <= 1}
                onClick={() => send("slide_change", { slide: current - 1 })}
              >
                Previous
              </button>
              <span style={{ alignSelf: "center" }}>
                {current} / {slideCount}
              </span>
              <button
                disabled={current >= slideCount}
                onClick={() => send("slide_change", { slide: current + 1 })}
              >
                Next slide
              </button>
            </div>
          )}

          {role === "attendee" && (
            <p className="muted" style={{ marginTop: "1rem" }}>
              Slide {current} of {slideCount} — synced with presenter
            </p>
          )}

          {role === "presenter" && currentSlide?.notes && (
            <div className="card" style={{ marginTop: "1rem" }}>
              <h3 style={{ marginTop: 0 }}>Speaker notes</h3>
              <p>{currentSlide.notes}</p>
            </div>
          )}
        </div>

        <InteractionPanel
          role={role}
          questions={liveState.questions}
          polls={liveState.polls}
          reactions={liveState.reactions}
          onAsk={(author, text) => send("question", { author, text })}
          onUpvote={(id) => send("upvote_question", { id })}
          onHighlight={(id) => send("highlight_question", { id })}
          onVote={(pollId, optionId) => send("vote_poll", { poll_id: pollId, option_id: optionId })}
          onEndPoll={(pollId) => send("end_poll", { poll_id: pollId })}
          onStartPoll={(question, options) => send("start_poll", { question, options })}
          onReact={(emoji) => send("reaction", { emoji })}
        />
      </div>
    </div>
  );
}
