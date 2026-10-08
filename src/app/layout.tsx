import type { Metadata } from "next";
import "./globals.css";
import { getCurrentUser } from "@/lib/auth";
import { Header } from "@/components/Header";

const siteName = process.env.NEXT_PUBLIC_SITE_NAME || "HZPU 校园论坛";

export const metadata: Metadata = {
  title: { default: siteName, template: `%s · ${siteName}` },
  description: "杭州职业技术大学校园论坛 · 校内交流平台",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  return (
    <html lang="zh-CN">
      <body>
        <Header user={user} siteName={siteName} />
        <main className="container">{children}</main>
        <footer className="site-footer">
          <div className="container">
            <div>{siteName} · 校内交流平台</div>
            <div style={{ marginTop: 6, fontSize: 12 }}>
              杭州职业技术大学 · Hangzhou Polytechnic University
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
