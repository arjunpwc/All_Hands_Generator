import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { CreateSessionResponse, Session } from "../types";

export default function HomePage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [result, setResult] = useState<CreateSessionResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/sessions")
      .then((res) => res.json())
      .then(setSessions)
      .catch(() => setSessions([]));
  }, [result]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("Choose a PowerPoint file first.");
      return;
    }

    setLoading(true);
    setError("");
    const form = new FormData();
    form.append("file", file);
    if (title.trim()) form.append("title", title.trim());

    try {
      const res = await fetch("/api/sessions", { method: "POST", body: form });
      if (!res.ok) throw new Error((await res.json()).detail || "Upload failed");
      setResult(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container">
      <header style={{ marginBottom: "2rem" }}>
        <h1 style={{ marginBottom: "0.25rem" }}>AllHands Web</h1>
        <p className="muted">Upload a PowerPoint deck and launch an interactive all-hands session.</p>
      </header>

      <div className="grid-2">
        <form className="card" onSubmit={onSubmit}>
          <h2 style={{ marginTop: 0 }}>Create session</h2>
          <label className="muted">PowerPoint file (.pptx)</label>
          <input
            type="file"
            accept=".pptx,.ppt"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            style={{ margin: "0.5rem 0 1rem" }}
          />
          <label className="muted">Session title (optional)</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} style={{ marginTop: "0.5rem" }} />
          {error && <p style={{ color: "#f87171" }}>{error}</p>}
          <button type="submit" disabled={loading} style={{ marginTop: "1rem" }}>
            {loading ? "Generating…" : "Generate website"}
          </button>
        </form>

        <div className="card">
          <h2 style={{ marginTop: 0 }}>Recent sessions</h2>
          {sessions.length === 0 ? (
            <p className="muted">No sessions yet.</p>
          ) : (
            <ul style={{ paddingLeft: "1.2rem" }}>
              {sessions.map((s) => (
                <li key={s.id} style={{ marginBottom: "0.75rem" }}>
                  <Link to={`/session/${s.id}`}>{s.title}</Link>
                  <div className="muted">{s.slide_count} slides</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {result && (
        <div className="card" style={{ marginTop: "1.5rem" }}>
          <h2 style={{ marginTop: 0 }}>Session ready</h2>
          <p>
            <strong>{result.title}</strong> — {result.slide_count} slides
          </p>
          <p>
            Presenter: <Link to={result.presenter_url}>{window.location.origin}{result.presenter_url}</Link>
          </p>
          <p>
            Attendees: <Link to={result.attendee_url}>{window.location.origin}{result.attendee_url}</Link>
          </p>
        </div>
      )}
    </div>
  );
}
