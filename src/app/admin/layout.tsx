"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { getClientUser } from "@/lib/client";

type SessionUser = { id: string; studentId: string; name: string; role: string; status: string };

const NAV = [
  { href: "/admin", label: "审核队列" },
  { href: "/admin/boards", label: "版块管理" },
  { href: "/admin/users", label: "用户管理" },
  { href: "/admin/words", label: "敏感词" },
  { href: "/admin/logs", label: "审核日志" },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [user, setUser] = useState<SessionUser | null | undefined>(undefined);

  useEffect(() => {
    getClientUser()
      .then((u) => setUser(u))
      .catch(() => setUser(null));
  }, []);

  if (user === undefined) {
    return (
      <div className="container" style={{ padding: "48px 16px", textAlign: "center" }}>
        <span className="spinner" aria-label="加载中" />
      </div>
    );
  }

  if (user === null || user.role !== "ADMIN") {
    return (
      <div className="container" style={{ padding: "48px 16px" }}>
        <div className="card" style={{ maxWidth: 420, margin: "0 auto", textAlign: "center" }}>
          <h1 style={{ marginTop: 0 }}>无权访问</h1>
          <p className="muted">此页面仅管理员可访问。</p>
          <Link href="/" className="btn btn-primary">
            返回首页
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      className="container"
      style={{
        display: "flex",
        gap: 24,
        padding: "24px 16px",
        alignItems: "flex-start",
      }}
    >
      <nav
        aria-label="管理后台导航"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 4,
          minWidth: 160,
          flexShrink: 0,
          position: "sticky",
          top: 16,
        }}
        className="admin-nav"
      >
        <div className="muted" style={{ padding: "0 12px 8px", fontSize: 13 }}>
          管理后台
        </div>
        {NAV.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                padding: "8px 12px",
                borderRadius: "var(--radius, 8px)",
                textDecoration: "none",
                color: active ? "#fff" : "var(--fg)",
                background: active ? "var(--primary)" : "transparent",
                fontWeight: active ? 600 : 400,
              }}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <main style={{ flex: 1, minWidth: 0 }}>{children}</main>
      <style jsx>{`
        @media (max-width: 720px) {
          .admin-nav {
            position: static !important;
            flex-direction: row !important;
            flex-wrap: wrap;
            min-width: 0 !important;
          }
          div.container {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
}
