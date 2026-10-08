"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, Suspense } from "react";
import { api, fmtTime } from "@/lib/client";
import { AuthGuard } from "@/components/AuthGuard";
import { Pagination } from "@/components/Pagination";

interface Notification {
  id: string;
  type: string;
  read: boolean;
  message: string;
  postId: string | null;
  actor: { id: string; name: string } | null;
  createdAt: string;
}

function NotificationsInner() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [list, setList] = useState<Notification[] | null>(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState("");
  const [markingAll, setMarkingAll] = useState(false);

  const load = useCallback((p: number) => {
    setList(null);
    api<{ notifications: Notification[]; total: number }>(`/api/notifications?page=${p}`)
      .then((d) => {
        setList(d.notifications);
        setTotal(d.total);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "加载失败"));
  }, []);

  useEffect(() => load(page), [load, page]);

  async function readAll() {
    setMarkingAll(true);
    try {
      await api("/api/notifications/read", { method: "POST", body: { all: true } });
      load(page);
    } catch (e) {
      setError(e instanceof Error ? e.message : "操作失败");
    } finally {
      setMarkingAll(false);
    }
  }

  async function onClick(n: Notification) {
    if (!n.read) {
      api("/api/notifications/read", { method: "POST", body: { ids: [n.id] } }).catch(() => {});
    }
    if (n.postId) router.push(`/post/${n.postId}`);
    else load(page);
  }

  return (
    <div>
      <div className="page-head">
        <h2>通知</h2>
        <button className="btn btn-sm" onClick={readAll} disabled={markingAll}>
          {markingAll ? "处理中…" : "全部已读"}
        </button>
      </div>
      {error && <div className="form-error">{error}</div>}
      {list === null ? (
        <div className="spinner">加载中…</div>
      ) : list.length === 0 ? (
        <div className="empty card">暂无通知</div>
      ) : (
        <div className="list-stack">
          {list.map((n) => (
            <button
              key={n.id}
              className="card card-hover"
              style={{
                textAlign: "left",
                cursor: "pointer",
                fontFamily: "inherit",
                fontSize: 14,
                background: n.read ? "var(--card)" : "color-mix(in srgb, var(--primary) 5%, var(--card))",
              }}
              onClick={() => onClick(n)}
            >
              <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
                {!n.read && <span className="badge" style={{ flexShrink: 0 }}> </span>}
                <span style={{ flex: 1 }}>
                  {n.actor && <strong>{n.actor.name} </strong>}
                  {n.message}
                </span>
                <span className="muted" style={{ flexShrink: 0 }}>
                  {fmtTime(n.createdAt)}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
      <Pagination page={page} pageSize={20} total={total} onChange={setPage} />
      <p className="muted" style={{ marginTop: 8 }}>
        <Link href="/">返回首页</Link>
      </p>
    </div>
  );
}

export default function NotificationsPage() {
  return (
    <AuthGuard>
      <Suspense fallback={<div className="spinner">加载中…</div>}>
        <NotificationsInner />
      </Suspense>
    </AuthGuard>
  );
}
