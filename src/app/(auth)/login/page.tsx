"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { api } from "@/lib/client";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [studentId, setStudentId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api("/api/auth/login", {
        method: "POST",
        body: { studentId, password },
      });
      const next = searchParams.get("next");
      router.push(next && next.startsWith("/") ? next : "/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "登录失败");
      setLoading(false);
    }
  }

  return (
    <div className="card auth-card">
      <div className="auth-brand">
        <img className="auth-logo" src="/logo.png" alt="杭州职业技术大学" />
        <h1 className="auth-title">登录校园论坛</h1>
        <p className="auth-sub">使用学号登录</p>
      </div>
      <form onSubmit={onSubmit}>
        <div className="form-field">
          <label htmlFor="studentId">学号</label>
          <input
            id="studentId"
            className="input"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            autoComplete="username"
            required
          />
        </div>
        <div className="form-field">
          <label htmlFor="password">密码</label>
          <input
            id="password"
            type="password"
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </div>
        {error && <div className="form-error">{error}</div>}
        <button className="btn btn-primary" style={{ width: "100%" }} disabled={loading}>
          {loading ? "登录中…" : "登录"}
        </button>
      </form>
      <p className="muted" style={{ marginTop: 16, marginBottom: 0 }}>
        还没有账号？<Link href="/register">立即注册</Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="spinner">加载中…</div>}>
      <LoginForm />
    </Suspense>
  );
}
