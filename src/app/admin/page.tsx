"use client";

import { useCallback, useEffect, useState } from "react";
import { api, fmtTime } from "@/lib/client";

type TargetType = "POST" | "FLOOR";
type Status = "PENDING" | "APPROVED" | "REJECTED";

interface QueueItem {
  id: string;
  status: Status;
  rejectReason: string | null;
  createdAt: string;
  author: { id: string; name: string; studentId?: string };
  title?: string;
  body?: string;
  content?: string;
  floorNo?: number;
  board?: { name: string };
  post?: { id: string; title: string };
}

const TYPE_TABS: { value: TargetType; label: string }[] = [
  { value: "POST", label: "帖子" },
  { value: "FLOOR", label: "回复" },
];

const STATUS_TABS: { value: Status; label: string }[] = [
  { value: "PENDING", label: "待审" },
  { value: "APPROVED", label: "已通过" },
  { value: "REJECTED", label: "已驳回" },
];

export default function AdminModerationPage() {
  const [type, setType] = useState<TargetType>("POST");
  const [status, setStatus] = useState<Status>("PENDING");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<QueueItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api<{ items: QueueItem[]; total: number; page: number; pageSize: number }>(
        `/api/admin/moderation?type=${type}&status=${status}&page=${page}&pageSize=20`
      );
      setItems(data.items);
      setTotal(data.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, [type, status, page]);

  useEffect(() => {
    load();
  }, [load]);

  const switchTab = (nextType: TargetType, nextStatus: Status) => {
    setType(nextType);
    setStatus(nextStatus);
    setPage(1);
  };

  const resolve = async (item: QueueItem, action: "APPROVE" | "REJECT") => {
    let reason = "";
    if (action === "REJECT") {
      const input = window.prompt("请输入驳回原因（必填）：", item.rejectReason ?? "");
      if (input === null) return;
      reason = input.trim();
      if (!reason) {
        setError("驳回必须填写原因");
        return;
      }
    }
    setError("");
    try {
      await api("/api/admin/moderation/resolve", {
        method: "POST",
        body: { targetType: type, targetId: item.id, action, reason: reason || undefined },
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "操作失败");
    }
  };

  const pageSize = 20;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>审核队列</h1>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 16 }}>
        <div className="tabs" role="tablist" aria-label="内容类型">
          {TYPE_TABS.map((t) => (
            <button
              key={t.value}
              className={`tab ${type === t.value ? "active" : ""}`}
              onClick={() => switchTab(t.value, status)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="tabs" role="tablist" aria-label="审核状态">
          {STATUS_TABS.map((s) => (
            <button
              key={s.value}
              className={`tab ${status === s.value ? "active" : ""}`}
              onClick={() => switchTab(type, s.value)}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: 32 }}>
          <span className="spinner" aria-label="加载中" />
        </div>
      ) : items.length === 0 ? (
        <div className="card empty">暂无记录</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {items.map((item) => {
            const title = item.title ?? item.post?.title ?? "";
            const excerpt = (item.body ?? item.content ?? "").replace(/\s+/g, " ").slice(0, 120);
            return (
              <div key={item.id} className="card">
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>
                      {title}
                      {item.floorNo != null && (
                        <span className="muted" style={{ fontWeight: 400 }}>
                          {" "}
                          （第 {item.floorNo} 楼）
                        </span>
                      )}
                    </div>
                    <div className="muted" style={{ fontSize: 14, marginBottom: 6 }}>
                      {excerpt}
                      {(item.body ?? item.content ?? "").length > 120 ? "…" : ""}
                    </div>
                    <div className="muted" style={{ fontSize: 13 }}>
                      {item.board ? `版块：${item.board.name} · ` : ""}
                      作者：{item.author.name} · {fmtTime(item.createdAt)}
                    </div>
                    {item.status === "REJECTED" && item.rejectReason && (
                      <div className="banner-danger" style={{ marginTop: 8 }}>
                        驳回原因：{item.rejectReason}
                      </div>
                    )}
                  </div>
                  {item.status === "PENDING" && (
                    <div style={{ display: "flex", gap: 8, alignItems: "flex-start", flexShrink: 0 }}>
                      <button className="btn btn-primary btn-sm" onClick={() => resolve(item, "APPROVE")}>
                        通过
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={() => resolve(item, "REJECT")}>
                        驳回
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="pagination" style={{ marginTop: 16, display: "flex", gap: 12, alignItems: "center" }}>
          <button className="btn btn-outline btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            上一页
          </button>
          <span className="muted">
            第 {page} / {totalPages} 页 · 共 {total} 条
          </span>
          <button
            className="btn btn-outline btn-sm"
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
          >
            下一页
          </button>
        </div>
      )}
    </div>
  );
}
