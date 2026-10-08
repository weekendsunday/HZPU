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
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
