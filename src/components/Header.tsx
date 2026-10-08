"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import type { SessionUser } from "@/lib/client";

const NAV_ITEMS = [
  { href: "/boards", label: "版块" },
  { href: "/hot", label: "热榜" },
  { href: "/search", label: "搜索" },
];

export function Header({ user, siteName }: { user: SessionUser | null; siteName: string }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    api<{ unread: number }>("/api/notifications?pageSize=1")
      .then((d) => {
        if (!cancelled) setUnread(d.unread || 0);
      })
      .catch(() => {});
    const timer = setInterval(() => {
      api<{ unread: number }>("/api/notifications?pageSize=1")
        .then((d) => {
          if (!cancelled) setUnread(d.unread || 0);
        })
        .catch(() => {});
    }, 60_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [user]);

  async function logout() {
    try {
      await api("/api/auth/logout", { method: "POST" });
    } catch {
      // 忽略登出错误，仍然刷新
    }
    location.reload();
  }

  const nav = (
    <>
      {NAV_ITEMS.map((item) => (
        <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)}>
          {item.label}
        </Link>
      ))}
    </>
  );

  return (
    <header className="site-header">
      <div className="container">
        <button
          className="nav-toggle"
          aria-label="打开菜单"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
        >
          ☰
        </button>
        <Link href="/" className="brand" onClick={() => setMenuOpen(false)}>
          {siteName}
        </Link>
        <nav className={`nav-links${menuOpen ? " open" : ""}`}>{nav}</nav>
        <div className="header-actions">
          {user ? (
            <>
              <Link href="/notifications">
                通知
                {unread > 0 && <span className="badge">{unread > 99 ? "99+" : unread}</span>}
              </Link>
              <Link href="/messages">私信</Link>
              {user.role === "ADMIN" && <Link href="/admin">管理后台</Link>}
              <Link href={`/user/${user.id}`}>{user.name}</Link>
              <button className="linklike" onClick={logout}>
                退出
              </button>
            </>
          ) : (
            <>
              <Link href="/login">登录</Link>
              <Link href="/register">注册</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
