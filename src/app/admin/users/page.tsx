"use client";

import { useCallback, useEffect, useState } from "react";
import { api, fmtTime, getClientUser } from "@/lib/client";

type Role = "USER" | "ADMIN";
type UserStatus = "ACTIVE" | "BANNED";

interface AdminUser {
  id: string;
  studentId: string;
  name: string;
  realName: string;
  role: Role;
  status: UserStatus;
  createdAt: string;
  _count: { posts: number };
}

interface ClientUser {
  id: string;
  role: string;
}

export default function AdminUsersPage() {
  const [me, setMe] = useState<ClientUser | null>(null);
  const [q, setQ] = useState("");
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState("");
  const [role, setRole] = useState("");
  const [page, setPage] = useState(1);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getClientUser()
      .then((u) => setMe(u))
      .catch(() => setMe(null));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: "20" });
      if (keyword) params.set("q", keyword);
      if (status) params.set("status", status);
      if (role) params.set("role", role);
      const data = await api<{ users: AdminUser[]; total: number }>(`/api/admin/users?${params}`);
      setUsers(data.users);
      setTotal(data.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, [keyword, status, role, page]);

  useEffect(() => {
    load();
  }, [load]);

  const patch = async (user: AdminUser, body: { role?: Role; status?: UserStatus }) => {
    setError("");
    try {
      const updated = await api<AdminUser>(`/api/admin/users/${user.id}`, { method: "POST", body });
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, ...updated } : u)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "操作失败");
    }
  };

  const pageSize = 20;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>用户管理</h1>

      <div className="card" style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", marginBottom: 16 }}>
        <input
          className="input"
          placeholder="搜索姓名或学号"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              setKeyword(q.trim());
              setPage(1);
            }
          }}
          style={{ minWidth: 200 }}
        />
        <select className="input" value={status} aria-label="状态筛选" onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">全部状态</option>
          <option value="ACTIVE">正常</option>
          <option value="BANNED">已封禁</option>
        </select>
        <select className="input" value={role} aria-label="角色筛选" onChange={(e) => { setRole(e.target.value); setPage(1); }}>
          <option value="">全部角色</option>
          <option value="USER">用户</option>
          <option value="ADMIN">管理员</option>
        </select>
        <button
          className="btn btn-primary btn-sm"
          onClick={() => {
            setKeyword(q.trim());
            setPage(1);
          }}
        >
          搜索
        </button>
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
      ) : users.length === 0 ? (
        <div className="card empty">没有匹配的用户</div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 640 }}>
            <thead>
              <tr className="muted" style={{ textAlign: "left", fontSize: 13 }}>
                <th style={{ padding: "8px" }}>学号</th>
                <th style={{ padding: "8px" }}>昵称</th>
                <th style={{ padding: "8px" }}>真实姓名</th>
                <th style={{ padding: "8px" }}>角色</th>
                <th style={{ padding: "8px" }}>状态</th>
                <th style={{ padding: "8px" }}>发帖数</th>
                <th style={{ padding: "8px" }}>注册时间</th>
                <th style={{ padding: "8px" }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const isSelf = me?.id === u.id;
                return (
                  <tr key={u.id} style={{ borderTop: "1px solid var(--border)" }}>
                    <td style={{ padding: "8px" }} className="muted">
                      {u.studentId}
                    </td>
                    <td style={{ padding: "8px" }}>
                      {u.name}
                      {isSelf && (
                        <span className="badge" style={{ marginLeft: 6 }}>
                          我
                        </span>
                      )}
                    </td>
                    <td style={{ padding: "8px" }}>
                      {u.realName ? (
                        <span className="real-name">{u.realName}</span>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td style={{ padding: "8px" }}>{u.role === "ADMIN" ? "管理员" : "用户"}</td>
                    <td style={{ padding: "8px" }}>
                      <span className={`badge ${u.status === "BANNED" ? "banner-danger" : ""}`}>
                        {u.status === "BANNED" ? "已封禁" : "正常"}
                      </span>
                    </td>
                    <td style={{ padding: "8px" }}>{u._count.posts}</td>
                    <td style={{ padding: "8px" }} className="muted">
                      {fmtTime(u.createdAt)}
                    </td>
                    <td style={{ padding: "8px" }}>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button
                          className={`btn btn-sm ${u.status === "BANNED" ? "btn-outline" : "btn-danger"}`}
                          disabled={isSelf}
                          onClick={() =>
                            patch(u, { status: u.status === "BANNED" ? "ACTIVE" : "BANNED" })
                          }
                        >
                          {u.status === "BANNED" ? "解封" : "封禁"}
                        </button>
                        <button
                          className="btn btn-outline btn-sm"
                          disabled={isSelf}
                          onClick={() => patch(u, { role: u.role === "ADMIN" ? "USER" : "ADMIN" })}
                        >
                          {u.role === "ADMIN" ? "取消管理员" : "设为管理员"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
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
            第 {page} / {totalPages} 页 · 共 {total} 人
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
