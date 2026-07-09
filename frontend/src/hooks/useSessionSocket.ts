import { useCallback, useEffect, useRef, useState } from "react";
import type { LiveState, Poll, Question } from "../types";

const defaultState: LiveState = {
  current_slide: 1,
  slide_count: 1,
  questions: [],
  polls: [],
  reactions: {},
};

export function useSessionSocket(sessionId: string, role: "presenter" | "attendee") {
  const [connected, setConnected] = useState(false);
  const [liveState, setLiveState] = useState<LiveState>(defaultState);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const ws = new WebSocket(`${protocol}://${window.location.host}/ws/${sessionId}?role=${role}`);
    socketRef.current = ws;

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      const { type, payload } = message;

      if (type === "state") {
        setLiveState((prev) => ({ ...prev, ...payload }));
        return;
      }

      if (type === "slide_change") {
        setLiveState((prev) => ({ ...prev, current_slide: payload.slide }));
        return;
      }

      if (type === "question") {
        setLiveState((prev) => ({ ...prev, questions: [...prev.questions, payload as Question] }));
        return;
      }

      if (type === "question_updated") {
        setLiveState((prev) => ({
          ...prev,
          questions: prev.questions.map((q) => (q.id === payload.id ? (payload as Question) : q)),
        }));
        return;
      }

      if (type === "poll_started") {
        setLiveState((prev) => ({ ...prev, polls: [...prev.polls, payload as Poll] }));
        return;
      }

      if (type === "poll_updated") {
        setLiveState((prev) => ({
          ...prev,
          polls: prev.polls.map((p) => (p.id === payload.id ? (payload as Poll) : p)),
        }));
        return;
      }

      if (type === "reaction") {
        setLiveState((prev) => ({
          ...prev,
          reactions: { ...prev.reactions, [payload.emoji]: payload.count },
        }));
      }
    };

    return () => ws.close();
  }, [sessionId, role]);

  const send = useCallback((type: string, payload: Record<string, unknown> = {}) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type, payload }));
    }
  }, []);

  return { connected, liveState, send };
}
