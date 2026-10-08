"use client";

import { useCallback, useEffect, useState } from "react";
import { api, fmtTime } from "@/lib/client";

interface Log {
  id: string;
  targetType: string;
  targetId: string;
  action: string;
  auto: boolean;
  reason: string;
  createdAt: string;
  reviewer: { name: string } | null;
}

export default function AdminLogsPage() {
  const [page, setPage] = useState(1);
  const [logs, setLogs] = useState<Log[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api<{ logs: Log[]; total: number }>(`/api/admin/logs?page=${page}&pageSize=20`);
      setLogs(data.logs);
      setTotal(data.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  const pageSize = 20;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>审核日志</h1>

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: 32 }}>
          <span className="spinner" aria-label="加载中" />
        </div>
      ) : logs.length === 0 ? (
        <div className="card empty">暂无日志</div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 640 }}>
            <thead>
              <tr className="muted" style={{ textAlign: "left", fontSize: 13 }}>
                <th style={{ padding: "8px" }}>目标类型</th>
                <th style={{ padding: "8px" }}>动作</th>
                <th style={{ padding: "8px" }}>方式</th>
                <th style={{ padding: "8px" }}>原因</th>
                <th style={{ padding: "8px" }}>操作人</th>
                <th style={{ padding: "8px" }}>时间</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} style={{ borderTop: "1px solid var(--border)" }}>
                  <td style={{ padding: "8px" }}>
                    {log.targetType === "POST" ? "帖子" : log.targetType === "FLOOR" ? "回复" : log.targetType}
                  </td>
                  <td style={{ padding: "8px" }}>
                    <span className={`badge ${log.action === "REJECT" ? "banner-danger" : ""}`}>
                      {log.action === "APPROVE" ? "通过" : log.action === "REJECT" ? "驳回" : log.action}
                    </span>
                  </td>
                  <td style={{ padding: "8px" }} className="muted">
                    {log.auto ? "自动" : "人工"}
                  </td>
                  <td style={{ padding: "8px", maxWidth: 240 }} className="muted">
                    {log.reason || "—"}
                  </td>
                  <td style={{ padding: "8px" }}>{log.reviewer?.name ?? "—"}</td>
                  <td style={{ padding: "8px" }} className="muted">
                    {fmtTime(log.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div style={{ marginTop: 16, display: "flex", gap: 12, alignItems: "center" }}>
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
