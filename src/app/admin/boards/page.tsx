"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { api } from "@/lib/client";

interface Board {
  id: string;
  name: string;
  slug: string;
  description: string;
  sort: number;
  locked: boolean;
  createdAt: string;
  _count: { posts: number };
}

export default function AdminBoardsPage() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // 新建表单
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [sort, setSort] = useState("0");
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api<{ boards: Board[] }>("/api/admin/boards");
      setBoards(data.boards);
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const flash = (msg: string) => {
    setNotice(msg);
    window.setTimeout(() => setNotice(""), 3000);
  };

  const create = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setCreating(true);
    try {
      await api("/api/admin/boards", {
        method: "POST",
        body: {
          name: name.trim(),
          slug: slug.trim(),
          description: description.trim(),
          sort: Number(sort) || 0,
        },
      });
      setName("");
      setSlug("");
      setDescription("");
      setSort("0");
      await load();
      flash("版块已创建");
    } catch (e2) {
      setError(e2 instanceof Error ? e2.message : "创建失败");
    } finally {
      setCreating(false);
    }
  };

  const update = async (id: string, patch: Partial<Pick<Board, "name" | "description" | "sort" | "locked">>) => {
    setError("");
    try {
      const updated = await api<Board>(`/api/admin/boards/${id}`, { method: "PUT", body: patch });
      setBoards((prev) => prev.map((b) => (b.id === id ? { ...b, ...updated } : b)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存失败");
      await load();
    }
  };

  const remove = async (board: Board) => {
    if (!window.confirm(`确定删除版块「${board.name}」？`)) return;
    setError("");
    try {
      await api(`/api/admin/boards/${board.id}`, { method: "DELETE" });
      setBoards((prev) => prev.filter((b) => b.id !== board.id));
      flash("版块已删除");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "删除失败";
      setError(msg.includes("409") || msg.includes("帖子") ? "版块内还有帖子，无法删除" : msg);
    }
  };

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>版块管理</h1>

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="muted" role="status">
          {notice}
        </p>
      )}

      <form className="card" onSubmit={create} style={{ marginBottom: 20 }}>
        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
          <label className="form-field">
            名称
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} required maxLength={32} />
          </label>
          <label className="form-field">
            Slug
            <input
              className="input"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              required
              pattern="[a-z0-9-]{2,32}"
              title="2-32 位小写字母、数字或连字符"
              placeholder="如 general"
            />
          </label>
          <label className="form-field">
            排序
            <input className="input" type="number" value={sort} onChange={(e) => setSort(e.target.value)} />
          </label>
          <label className="form-field" style={{ gridColumn: "1 / -1" }}>
            描述
            <input className="input" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={200} />
          </label>
        </div>
        <button className="btn btn-primary" style={{ marginTop: 12 }} disabled={creating}>
          {creating ? "创建中…" : "新建版块"}
        </button>
      </form>

      {loading ? (
        <div style={{ textAlign: "center", padding: 32 }}>
          <span className="spinner" aria-label="加载中" />
        </div>
      ) : boards.length === 0 ? (
        <div className="card empty">还没有版块</div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 640 }}>
            <thead>
              <tr className="muted" style={{ textAlign: "left", fontSize: 13 }}>
                <th style={{ padding: "8px" }}>名称</th>
                <th style={{ padding: "8px" }}>Slug</th>
                <th style={{ padding: "8px" }}>描述</th>
                <th style={{ padding: "8px" }}>排序</th>
                <th style={{ padding: "8px" }}>锁定</th>
                <th style={{ padding: "8px" }}>帖子数</th>
                <th style={{ padding: "8px" }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {boards.map((b) => (
                <tr key={b.id} style={{ borderTop: "1px solid var(--border)" }}>
                  <td style={{ padding: "8px" }}>
                    <input
                      className="input"
                      defaultValue={b.name}
                      maxLength={32}
                      style={{ minWidth: 120 }}
                      onBlur={(e) => {
                        const v = e.target.value.trim();
                        if (v && v !== b.name) update(b.id, { name: v });
                      }}
                    />
                  </td>
                  <td style={{ padding: "8px" }} className="muted">
                    {b.slug}
                  </td>
                  <td style={{ padding: "8px" }}>
                    <input
                      className="input"
                      defaultValue={b.description}
                      maxLength={200}
                      style={{ minWidth: 160 }}
                      onBlur={(e) => {
                        if (e.target.value.trim() !== b.description) update(b.id, { description: e.target.value.trim() });
                      }}
                    />
                  </td>
                  <td style={{ padding: "8px" }}>
                    <input
                      className="input"
                      type="number"
                      defaultValue={b.sort}
                      style={{ width: 80 }}
                      onBlur={(e) => {
                        const v = Number(e.target.value) || 0;
                        if (v !== b.sort) update(b.id, { sort: v });
                      }}
                    />
                  </td>
                  <td style={{ padding: "8px" }}>
                    <input
                      type="checkbox"
                      checked={b.locked}
                      aria-label={`锁定 ${b.name}`}
                      onChange={(e) => update(b.id, { locked: e.target.checked })}
                    />
                  </td>
                  <td style={{ padding: "8px" }}>{b._count.posts}</td>
                  <td style={{ padding: "8px" }}>
                    <button className="btn btn-danger btn-sm" onClick={() => remove(b)}>
                      删除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
