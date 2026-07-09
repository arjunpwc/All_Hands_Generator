import type { Slide, SlideShape } from "../types";

function assetUrl(sessionId: string, src: string) {
  if (src.startsWith("http")) return src;
  return `/static/sessions/${sessionId}/${src}`;
}

function ShapeView({ sessionId, shape }: { sessionId: string; shape: SlideShape }) {
  if (shape.type === "text" && shape.bullets) {
    return (
      <ul>
        {shape.bullets.map((bullet, i) => (
          <li key={i}>{bullet}</li>
        ))}
      </ul>
    );
  }

  if (shape.type === "image" && shape.src) {
    return (
      <img
        src={assetUrl(sessionId, shape.src)}
        alt={shape.alt || "slide image"}
        style={{ maxWidth: "100%", borderRadius: 8 }}
      />
    );
  }

  if (shape.type === "table" && shape.rows) {
    return (
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <tbody>
          {shape.rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j} style={{ border: "1px solid var(--border)", padding: "0.5rem" }}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  if (shape.type === "group" && shape.children) {
    return (
      <div>
        {shape.children.map((child, i) => (
          <ShapeView key={i} sessionId={sessionId} shape={child} />
        ))}
      </div>
    );
  }

  return null;
}

export default function SlideViewer({
  sessionId,
  slide,
}: {
  sessionId: string;
  slide: Slide | undefined;
}) {
  if (!slide) {
    return <div className="card">Loading slide…</div>;
  }

  return (
    <div className="card">
      <p className="muted" style={{ marginTop: 0 }}>
        Slide {slide.index}
      </p>
      <h2 style={{ marginTop: 0 }}>{slide.title}</h2>
      {slide.shapes.map((shape, i) => (
        <ShapeView key={i} sessionId={sessionId} shape={shape} />
      ))}
    </div>
  );
}
