import { useEffect, useState } from "react";

type Story = {
  id: number;
  prompt: string;
  story: string;
  created_at: string;
};

const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000";

export default function App() {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stories, setStories] = useState<Story[]>([]);
  const [current, setCurrent] = useState<string>("");

  const loadStories = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/story`);
      if (!res.ok) throw new Error("Failed to load stories");
      const data: Story[] = await res.json();
      setStories(data);
    } catch (e: any) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadStories();
  }, []);

  const generate = async () => {
    const p = prompt.trim();
    if (!p) return;
    setLoading(true);
    setError(null);
    setCurrent("");
    try {
      const res = await fetch(`${API_BASE}/api/story`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: p }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Server error");
      }
      const data: Story = await res.json();
      setCurrent(data.story);
      setStories((prev) => [data, ...prev]);
      setPrompt("");
    } catch (e: any) {
      setError(e.message || "Failed to generate");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{ maxWidth: 800, margin: "40px auto", fontFamily: "sans-serif" }}
    >
      <h2>AI Story Generator (Mistral)</h2>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          style={{ flex: 1, padding: 8 }}
          placeholder="על איזה נושא לכתוב סיפור?"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && generate()}
        />
        <button onClick={generate} disabled={loading || !prompt.trim()}>
          {loading ? "יוצר..." : "צור סיפור"}
        </button>
      </div>
      {error && <div style={{ color: "red", marginTop: 10 }}>{error}</div>}

      {current && (
        <div style={{ marginTop: 20, padding: 12, border: "1px solid #ddd" }}>
          <h4>סיפור שנוצר עכשיו</h4>
          <pre style={{ whiteSpace: "pre-wrap" }}>{current}</pre>
        </div>
      )}

      <h3 style={{ marginTop: 24 }}>סיפורים אחרונים (DB)</h3>
      <div style={{ display: "grid", gap: 12 }}>
        {stories.map((s) => (
          <div key={s.id} style={{ border: "1px solid #eee", padding: 12 }}>
            <div style={{ fontSize: 12, color: "#666" }}>
              נושא: {s.prompt} — {new Date(s.created_at).toLocaleString()}
            </div>
            <pre style={{ whiteSpace: "pre-wrap", marginTop: 8 }}>
              {s.story}
            </pre>
          </div>
        ))}
        {!stories.length && (
          <div style={{ color: "#666" }}>אין עדיין סיפורים.</div>
        )}
      </div>
    </div>
  );
}
