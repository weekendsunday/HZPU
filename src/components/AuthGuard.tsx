"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { getClientUser } from "@/lib/client";

/** 登录守卫：未登录时跳转 /login?next=当前路径。 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    let cancelled = false;
    getClientUser().then((user) => {
      if (cancelled) return;
      if (!user) {
        const query = searchParams.toString();
        const next = query ? `${pathname}?${query}` : pathname;
        router.replace(`/login?next=${encodeURIComponent(next)}`);
      } else {
        setReady(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [router, pathname, searchParams]);

  if (!ready) {
    return <div className="spinner">加载中…</div>;
  }
  return <>{children}</>;
}
