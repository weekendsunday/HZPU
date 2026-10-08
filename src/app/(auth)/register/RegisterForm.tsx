"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client";
import { ssoErrorMessage, type SsoPublicInfo } from "@/lib/sso-client";

export default function RegisterForm({ sso }: { sso: SsoPublicInfo }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [studentId, setStudentId] = useState("");
  const [name, setName] = useState("");
  const [realName, setRealName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const ssoError = ssoErrorMessage(searchParams.get("sso_error"));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (name.trim().length < 2) {
      setError("昵称至少 2 个字符");
      return;
    }
    if (realName.trim().length < 2) {
      setError("请填写真实姓名");
      return;
    }
    if (password.length < 6) {
      setError("密码至少 6 位");
      return;
    }
    if (password !== confirm) {
      setError("两次输入的密码不一致");
      return;
    }
    setLoading(true);
    try {
      await api("/api/auth/register", {
        method: "POST",
        body: {
          studentId: studentId.trim(),
          name: name.trim(),
          realName: realName.trim(),
          password,
        },
      });
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "注册失败");
      setLoading(false);
    }
  }

  return (
    <div className="card auth-card auth-card-wide">
      <div className="auth-brand">
        <img className="auth-logo" src="/logo.png" alt="杭州职业技术大学" />
        <h1 className="auth-title">注册校园论坛</h1>
        <p className="auth-sub">
          用学号创建账号 · 昵称对外显示 · 真实姓名仅你与管理员可见
        </p>
      </div>

      {ssoError && <div className="form-error">{ssoError}</div>}

      <div className="sso-block">
        {sso.enabled ? (
          <>
            <a className="btn btn-outline" href="/api/auth/sso/start">
              使用{sso.label}注册 / 绑定已有账号
            </a>
            <div className="sso-note" style={{ marginTop: 10 }}>
              走统一身份认证时，<strong>学号、真实姓名、学院班级由学校系统直接提供</strong>，
              无需手工填写，也无法填错；昵称仍需你自己取一个。
              第一次认证会自动建档，之后再用认证登录会直接进入原账号。
            </div>
          </>
        ) : (
          <div className="sso-note">
            <strong>学校统一身份认证：接入通道已预留。</strong>
            <br />
            启用后，学号与真实姓名将由学校系统直接返回并自动填充，不需要手工填写。
            待学校网络信息中心提供 IdP 地址与接入凭据后，在服务端配置 <code>SSO_*</code> 环境变量即可启用，
            无需改动代码。在此之前请使用下方表单注册。
          </div>
        )}
      </div>

      {sso.enabled && <div className="auth-divider">或手工填写注册</div>}

      <form onSubmit={onSubmit}>
        <div className="form-field">
          <label htmlFor="studentId">学号</label>
          <input
            id="studentId"
            className="input"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            placeholder="请输入学号"
            autoComplete="username"
            required
          />
          <div className="hint">注册后不可修改，格式以学校学号规则为准</div>
        </div>

        <div className="form-field">
          <label htmlFor="name">昵称</label>
          <input
            id="name"
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="2-20 个字符"
            maxLength={20}
            autoComplete="nickname"
            required
          />
          <div className="hint">全站唯一 · 发帖、回帖、@提及显示的都是昵称</div>
        </div>

        <div className="form-field">
          <label htmlFor="realName">真实姓名</label>
          <input
            id="realName"
            className="input"
            value={realName}
            onChange={(e) => setRealName(e.target.value)}
            placeholder="与学籍一致"
            maxLength={20}
            autoComplete="name"
            required
          />
          {sso.enabled && (
            <div className="hint">走统一身份认证时此项由学校系统提供，无需手工填写</div>
          )}
        </div>

        <div className="field-row">
          <div className="form-field">
            <label htmlFor="password">密码</label>
            <input
              id="password"
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="至少 6 位"
              autoComplete="new-password"
              required
            />
          </div>
          <div className="form-field">
            <label htmlFor="confirm">确认密码</label>
            <input
              id="confirm"
              type="password"
              className="input"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              required
            />
          </div>
        </div>

        <div className="form-note">
          <strong>实名留档说明：</strong>
          真实姓名允许同名同姓，仅用于校内实名留档；
          其他同学在你的帖子里只能看到昵称，看不到真实姓名。
        </div>

        {error && <div className="form-error">{error}</div>}

        <button className="btn btn-primary" style={{ width: "100%" }} disabled={loading}>
          {loading ? "注册中…" : "注册"}
        </button>
      </form>

      <p className="muted" style={{ marginTop: 16, marginBottom: 0, textAlign: "center" }}>
        已有账号？<Link href="/login">去登录</Link>
      </p>
    </div>
  );
}
