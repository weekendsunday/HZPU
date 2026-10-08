"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client";
import { ssoErrorMessage, type SsoPublicInfo } from "@/lib/sso-client";

export default function LoginForm({ sso }: { sso: SsoPublicInfo }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [studentId, setStudentId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const next = searchParams.get("next");
  const nextPath = next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
  const ssoError = ssoErrorMessage(searchParams.get("sso_error"));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api("/api/auth/login", {
        method: "POST",
        body: { studentId, password },
      });
      router.push(nextPath);
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
        <p className="auth-sub">
          {sso.enabled ? `用${sso.label}或学号登录` : "使用学号登录"}
        </p>
      </div>

      {ssoError && <div className="form-error">{ssoError}</div>}

      <div className="sso-block">
        {sso.enabled ? (
          <a
            className="btn btn-outline"
            href={`/api/auth/sso/start?next=${encodeURIComponent(nextPath)}`}
          >
            使用{sso.label}登录
          </a>
        ) : (
          <div className="sso-note">
            <strong>学校统一身份认证：接入通道已预留。</strong>
            <br />
            待学校网络信息中心提供 IdP 地址与接入凭据后，在服务端配置 <code>SSO_*</code> 环境变量即可启用，
            无需改动代码。启用前请使用下方学号密码登录。
          </div>
        )}
      </div>

      {sso.enabled && <div className="auth-divider">或使用学号密码登录</div>}

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
