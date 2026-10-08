"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { api, getClientUser } from "@/lib/client";
import type { SessionUser } from "@/lib/client";
import { Editor } from "@/components/Editor";
import { AuthGuard } from "@/components/AuthGuard";

interface Board {
  id: string;
  name: string;
  slug: string;
  locked: boolean;
}

function NewPostInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const presetSlug = searchParams.get("board") || "";

  const [boards, setBoards] = useState<Board[]>([]);
  const [boardId, setBoardId] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    getClientUser().then((u) => {
      if (!u) {
        router.replace(`/login?next=${encodeURIComponent("/new")}`);
        return;
      }
      setUser(u);
    });
    api<{ boards: Board[] }>("/api/boards")
      .then((d) => {
        setBoards(d.boards);
        const preset = d.boards.find((b) => b.slug === presetSlug && !b.locked);
        if (preset) setBoardId(preset.id);
        else if (d.boards.length > 0) setBoardId(d.boards[0].id);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "加载失败"));
  }, [router, presetSlug]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setNotice("");
    if (!boardId) {
      setError("请选择版块");
      return;
    }
    setSubmitting(true);
    try {
      const d = await api<{
        post: { id: string };
        moderation: { pass: boolean; reason?: string };
      }>("/api/posts", {
        method: "POST",
        body: { boardId, title, body },
      });
      if (d.moderation.pass) {
        router.push(`/post/${d.post.id}`);
      } else {
        setNotice(`已提交审核，通过后将自动发布${d.moderation.reason ? `（原因：${d.moderation.reason}）` : ""}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "发布失败");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h2>发布新帖</h2>
      <div className="banner banner-warning">
        实名记录：本贴会以真实姓名
        {user?.realName ? `「${user.realName}」` : ""}
        归档，仅你本人与管理员可见；其他同学看到的仍是你的昵称。
      </div>
      <form onSubmit={onSubmit}>
        <div className="form-field">
          <label htmlFor="board">版块</label>
          <select
            id="board"
            className="input"
            value={boardId}
            onChange={(e) => setBoardId(e.target.value)}
          >
            {boards.map((b) => (
              <option key={b.id} value={b.id} disabled={b.locked}>
                {b.name}
                {b.locked ? "（已锁定）" : ""}
              </option>
            ))}
          </select>
        </div>
        <Editor title={title} setTitle={setTitle} body={body} setBody={setBody} />
        {error && <div className="form-error">{error}</div>}
        {notice && <div className="form-ok">{notice}</div>}
        <div className="btn-row">
          <button className="btn btn-primary" disabled={submitting || !title.trim() || !body.trim()}>
            {submitting ? "提交中…" : "发布"}
          </button>
          {notice && (
            <button type="button" className="btn" onClick={() => router.push("/")}>
              返回首页
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

export default function NewPostPage() {
  return (
    <AuthGuard>
      <Suspense fallback={<div className="spinner">加载中…</div>}>
        <NewPostInner />
      </Suspense>
    </AuthGuard>
  );
}
