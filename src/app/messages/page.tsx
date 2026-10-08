"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { api, fmtTime } from "@/lib/client";
import { AuthGuard } from "@/components/AuthGuard";

interface Conversation {
  id: string;
  other: { id: string; name: string };
  lastMessage: { content: string; createdAt: string } | null;
  unreadCount: number;
}

function MessagesInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const presetTo = searchParams.get("to") || "";

  const [convs, setConvs] = useState<Conversation[] | null>(null);
  const [error, setError] = useState("");
  const [to, setTo] = useState(presetTo);
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);

  const load = useCallback(() => {
    api<{ conversations: Conversation[] }>("/api/messages")
      .then((d) => setConvs(d.conversations))
      .catch((e) => setError(e instanceof Error ? e.message : "加载失败"));
  }, []);

  useEffect(load, [load]);

  async function startConversation(e: React.FormEvent) {
    e.preventDefault();
    if (!to.trim() || !content.trim()) return;
    setSending(true);
    setError("");
    try {
      const d = await api<{ conversationId: string }>("/api/messages", {
        method: "POST",
        body: { to: to.trim(), content: content.trim() },
      });
      router.push(`/messages/${d.conversationId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "发送失败");
      setSending(false);
    }
  }

  return (
    <div>
      <div className="page-head">
        <h2>私信</h2>
      </div>

      <details className="card" style={{ marginBottom: 16 }} open={!!presetTo}>
        <summary style={{ cursor: "pointer", fontWeight: 600 }}>新建私信</summary>
        <form onSubmit={startConversation} style={{ marginTop: 12 }}>
          <div className="form-field">
            <label htmlFor="to">收件人</label>
            <input
              id="to"
              className="input"
              placeholder="对方姓名或学号"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              required
            />
          </div>
          <div className="form-field">
            <label htmlFor="content">内容</label>
            <textarea
              id="content"
              className="textarea"
              style={{ minHeight: 100 }}
              value={content}
              maxLength={2000}
              onChange={(e) => setContent(e.target.value)}
              required
            />
          </div>
          {error && <div className="form-error">{error}</div>}
          <button className="btn btn-primary" disabled={sending}>
            {sending ? "发送中…" : "发送"}
          </button>
        </form>
      </details>

      {convs === null ? (
        <div className="spinner">加载中…</div>
      ) : convs.length === 0 ? (
        <div className="empty card">还没有私信会话</div>
      ) : (
        <div className="list-stack">
          {convs.map((c) => (
            <Link key={c.id} href={`/messages/${c.id}`} className="card card-hover conv-item">
              <span className="avatar">{c.other.name.slice(0, 1)}</span>
              <div className="conv-main">
                <div className="conv-name">
                  {c.other.name}
                  {c.unreadCount > 0 && <span className="badge" style={{ marginLeft: 8 }}>{c.unreadCount}</span>}
                </div>
                <div className="conv-preview">
                  {c.lastMessage ? c.lastMessage.content : "（暂无消息）"}
                </div>
              </div>
              <span className="muted" style={{ flexShrink: 0 }}>
                {c.lastMessage ? fmtTime(c.lastMessage.createdAt) : ""}
              </span>
            </Link>
          ))}
        </div>
      )}
      <p className="muted" style={{ marginTop: 8 }}>
        <Link href="/">返回首页</Link>
      </p>
    </div>
  );
}

export default function MessagesPage() {
  return (
    <AuthGuard>
      <Suspense fallback={<div className="spinner">加载中…</div>}>
        <MessagesInner />
      </Suspense>
    </AuthGuard>
  );
}
