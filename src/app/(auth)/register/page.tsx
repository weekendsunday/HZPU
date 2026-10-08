"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client";

export default function RegisterPage() {
  const router = useRouter();
  const [studentId, setStudentId] = useState("");
  const [name, setName] = useState("");
  const [realName, setRealName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 6) {
      setError("密码至少 6 位");
      return;
    }
    setLoading(true);
    try {
      await api("/api/auth/register", {
        method: "POST",
        body: { studentId, name, realName, password },
      });
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "注册失败");
      setLoading(false);
    }
  }

  return (
    <div className="card auth-card">
      <h2>注册</h2>
      <form onSubmit={onSubmit}>
        <div className="form-field">
          <label htmlFor="studentId">学号</label>
          <input
            id="studentId"
            className="input"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            placeholder="12 位数字学号"
            autoComplete="username"
            required
          />
          <div className="hint">学号为 12 位数字，注册后不可修改</div>
        </div>
        <div className="form-field">
          <label htmlFor="name">昵称</label>
          <input
            id="name"
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="nickname"
            required
          />
          <div className="hint">全站唯一，不可与他人重复；发帖时对外显示的就是昵称</div>
        </div>
        <div className="form-field">
          <label htmlFor="realName">真实姓名</label>
          <input
            id="realName"
            className="input"
            value={realName}
            onChange={(e) => setRealName(e.target.value)}
            autoComplete="name"
            required
          />
          <div className="hint">仅你本人与管理员可见，允许同名同姓</div>
        </div>
        <div className="form-field">
          <label htmlFor="password">密码</label>
          <input
            id="password"
            type="password"
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            required
          />
          <div className="hint">至少 6 位</div>
        </div>
        {error && <div className="form-error">{error}</div>}
        <button className="btn btn-primary" style={{ width: "100%" }} disabled={loading}>
          {loading ? "注册中…" : "注册"}
        </button>
      </form>
      <p className="muted" style={{ marginTop: 16, marginBottom: 0 }}>
        已有账号？<Link href="/login">去登录</Link>
      </p>
    </div>
  );
}
