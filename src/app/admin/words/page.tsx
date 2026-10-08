"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { api } from "@/lib/client";

interface Word {
  id: string;
  word: string;
}

export default function AdminWordsPage() {
  const [words, setWords] = useState<Word[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [input, setInput] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api<{ words: Word[] }>("/api/admin/words");
      setWords(data.words);
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const add = async (e: FormEvent) => {
    e.preventDefault();
    const word = input.trim();
    if (!word) return;
    setSubmitting(true);
    setError("");
    try {
      await api("/api/admin/words", { method: "POST", body: { word } });
      setInput("");
      await load();
    } catch (e2) {
      setError(e2 instanceof Error ? e2.message : "添加失败");
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (w: Word) => {
    setError("");
    try {
      await api(`/api/admin/words?id=${encodeURIComponent(w.id)}`, { method: "DELETE" });
      setWords((prev) => prev.filter((x) => x.id !== w.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "删除失败");
    }
  };

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>敏感词</h1>

      <form className="card" onSubmit={add} style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 20 }}>
        <input
          className="input"
          placeholder="输入敏感词"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          maxLength={64}
          style={{ flex: 1, minWidth: 160 }}
        />
        <button className="btn btn-primary" disabled={submitting || !input.trim()}>
          {submitting ? "添加中…" : "添加"}
        </button>
      </form>

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: 32 }}>
          <span className="spinner" aria-label="加载中" />
        </div>
      ) : words.length === 0 ? (
        <div className="card empty">还没有敏感词</div>
      ) : (
        <div className="card" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {words.map((w) => (
            <span
              key={w.id}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "4px 10px",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius, 8px)",
                background: "var(--card)",
              }}
            >
              {w.word}
              <button
                onClick={() => remove(w)}
                aria-label={`删除敏感词 ${w.word}`}
                style={{
                  border: "none",
                  background: "none",
                  cursor: "pointer",
                  color: "var(--danger)",
                  fontSize: 14,
                  padding: 0,
                }}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
