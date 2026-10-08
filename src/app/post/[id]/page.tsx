"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { api, fmtTime, getClientUser, type SessionUser } from "@/lib/client";
import { MarkdownView } from "@/components/MarkdownView";
import { Editor } from "@/components/Editor";

interface PostDetail {
  id: string;
  title: string;
  body: string;
  status: string;
  rejectReason: string | null;
  viewCount: number;
  replyCount: number;
  createdAt: string;
  author: { id: string; name: string; studentId: string };
  board: { id: string; name: string; slug: string };
}

interface Floor {
  id: string;
  floorNo: number;
  content: string;
  createdAt: string;
  author: { id: string; name: string };
}

export default function PostPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const postId = params.id;
  const [post, setPost] = useState<PostDetail | null>(null);
  const [floors, setFloors] = useState<Floor[] | null>(null);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [error, setError] = useState("");
  const [reply, setReply] = useState("");
  const [replyMsg, setReplyMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [replying, setReplying] = useState(false);

  const load = useCallback(() => {
    api<{ post: PostDetail; floors: Floor[] }>(`/api/posts/${postId}`)
      .then((d) => {
        setPost(d.post);
        setFloors(d.floors);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "加载失败"));
  }, [postId]);

  useEffect(() => {
    load();
    getClientUser().then(setUser);
  }, [load]);

  async function submitReply() {
    if (!reply.trim()) return;
    setReplying(true);
    setReplyMsg(null);
    try {
      const d = await api<{ floor: { id: string }; moderation: { pass: boolean; reason?: string } }>(
        `/api/posts/${postId}/floors`,
        { method: "POST", body: { content: reply } }
      );
      if (d.moderation.pass) {
        setReply("");
        setReplyMsg({ ok: true, text: "发布成功" });
        load();
      } else {
        setReply("");
        setReplyMsg({ ok: false, text: `已提交审核${d.moderation.reason ? `：${d.moderation.reason}` : ""}` });
      }
    } catch (err) {
      setReplyMsg({ ok: false, text: err instanceof Error ? err.message : "回复失败" });
    } finally {
      setReplying(false);
    }
  }

  if (error) {
    return (
      <div>
        <div className="form-error">{error}</div>
        <Link href="/">返回首页</Link>
      </div>
    );
  }
  if (!post || floors === null) {
    return <div className="spinner">加载中…</div>;
  }

  return (
    <div>
      <div className="muted" style={{ marginBottom: 8 }}>
        <Link href={`/board/${post.board.slug}`}>{post.board.name}</Link>
      </div>
      <h2 style={{ marginBottom: 4 }}>{post.title}</h2>
      <div className="muted" style={{ marginBottom: 16 }}>
        <Link href={`/user/${post.author.id}`}>{post.author.name}</Link> ·{" "}
        {fmtTime(post.createdAt)} · 浏览 {post.viewCount} · 回复 {post.replyCount}
      </div>

      {post.status === "PENDING" && (
        <div className="banner banner-warning">此帖正在审核中，仅作者与管理员可见。</div>
      )}
      {post.status === "REJECTED" && (
        <div className="banner banner-danger">
          此帖未通过审核{post.rejectReason ? `：${post.rejectReason}` : ""}
        </div>
      )}

      {/* 主楼 */}
      <div className="card">
        <MarkdownView content={post.body} />
      </div>

      <h3 style={{ margin: "20px 0 12px" }}>全部回复（{post.replyCount}）</h3>
      {floors.length === 0 ? (
        <div className="empty card">还没有回复</div>
      ) : (
        <div className="list-stack">
          {floors.map((f) => (
            <div key={f.id} className="card floor">
              <Link href={`/user/${f.author.id}`} className="avatar" title={f.author.name}>
                {f.author.name.slice(0, 1)}
              </Link>
              <div className="floor-body">
                <div className="floor-head">
                  <Link href={`/user/${f.author.id}`}>{f.author.name}</Link>
                  <span className="floor-no">#{f.floorNo} 楼 · {fmtTime(f.createdAt)}</span>
                </div>
                <MarkdownView content={f.content} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 回复框 */}
      <div className="card reply-box">
        {user ? (
          <>
            <Editor hideTitle title="" setTitle={() => {}} body={reply} setBody={setReply} />
            {replyMsg && (
              <div className={replyMsg.ok ? "form-ok" : "form-error"}>{replyMsg.text}</div>
            )}
            <button
              className="btn btn-primary"
              disabled={replying || !reply.trim()}
              onClick={submitReply}
            >
              {replying ? "提交中…" : "回复"}
            </button>
          </>
        ) : (
          <div className="empty" style={{ padding: "20px 0" }}>
            <Link href={`/login?next=${encodeURIComponent(`/post/${postId}`)}`}>登录</Link>
            {" 后参与回复，"}
            <Link href="/register">没有账号？注册</Link>
          </div>
        )}
      </div>
    </div>
  );
}
