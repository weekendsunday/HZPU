"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, Suspense } from "react";
import { api, fmtTime, getClientUser, type SessionUser } from "@/lib/client";
import { AuthGuard } from "@/components/AuthGuard";

interface Message {
  id: string;
  content: string;
  read: boolean;
  createdAt: string;
  sender: { id: string; name: string };
}

function ChatInner({ conversationId }: { conversationId: string }) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [other, setOther] = useState<{ id: string; name: string } | null>(null);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [error, setError] = useState("");
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = useCallback(() => {
    api<{ messages: Message[]; other: { id: string; name: string } }>(`/api/messages/${conversationId}`)
      .then((d) => {
        setMessages(d.messages);
        setOther(d.other);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "加载失败"));
  }, [conversationId]);

  useEffect(() => {
    load();
    getClientUser().then(setUser);
  }, [load]);

  // 每 15 秒轮询新消息
  useEffect(() => {
    const timer = setInterval(load, 15_000);
    return () => clearInterval(timer);
  }, [load]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    setSending(true);
    setError("");
    try {
      await api(`/api/messages/${conversationId}`, {
        method: "POST",
        body: { content: input.trim() },
      });
      setInput("");
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "发送失败");
    } finally {
      setSending(false);
    }
  }

  return (
    <div>
      <div className="page-head">
        <h2>
          与 {other ? <Link href={`/user/${other.id}`}>{other.name}</Link> : "…"} 的对话
        </h2>
        <Link href="/messages" className="muted">
          ← 返回私信列表
        </Link>
      </div>
      {error && <div className="form-error">{error}</div>}
      {messages === null ? (
        <div className="spinner">加载中…</div>
      ) : (
        <div className="card">
          <div className="chat-box">
            {messages.length === 0 && <div className="empty">开始对话吧</div>}
            {messages.map((m) => {
              const mine = user?.id === m.sender.id;
              return (
                <div key={m.id} className={`bubble-row${mine ? " mine" : ""}`}>
                  {!mine && <span className="avatar" style={{ width: 28, height: 28, fontSize: 12 }}>{m.sender.name.slice(0, 1)}</span>}
                  <div>
                    <div className="bubble">{m.content}</div>
                    <div className="muted" style={{ fontSize: 12, marginTop: 2, textAlign: mine ? "right" : "left" }}>
                      {fmtTime(m.createdAt)}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
          <form className="chat-input-row" onSubmit={send}>
            <input
              className="input"
              placeholder="输入消息…"
              value={input}
              maxLength={2000}
              onChange={(e) => setInput(e.target.value)}
            />
            <button className="btn btn-primary" disabled={sending || !input.trim()}>
              发送
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export default function ChatPage({ params }: { params: { id: string } }) {
  return (
    <AuthGuard>
      <Suspense fallback={<div className="spinner">加载中…</div>}>
        <ChatInner conversationId={params.id} />
      </Suspense>
    </AuthGuard>
  );
}
