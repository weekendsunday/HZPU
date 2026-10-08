import { NextRequest, NextResponse } from "next/server";
import {
  buildAuthorizeUrl,
  callbackUrl,
  newState,
  safeNextPath,
  ssoConfig,
  ssoEnabled,
  SSO_NEXT_COOKIE,
  SSO_STATE_COOKIE,
} from "@/lib/sso";

export const dynamic = "force-dynamic";

/** 发起统一身份认证：跳到 IdP 授权页，并把 state / 回跳地址暂存在 Cookie 里。 */
export async function GET(req: NextRequest) {
  const cfg = ssoConfig();
  if (!ssoEnabled()) {
    return NextResponse.redirect(new URL("/login?sso_error=disabled", req.url));
  }

  const redirectUri = callbackUrl(cfg, req.headers, req.nextUrl.origin);
  const state = newState();
  const next = safeNextPath(req.nextUrl.searchParams.get("next"));

  const res = NextResponse.redirect(buildAuthorizeUrl(cfg, redirectUri, state));
  const cookieOpts = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600, // 10 分钟内必须走完认证
  };
  res.cookies.set(SSO_STATE_COOKIE, state, cookieOpts);
  res.cookies.set(SSO_NEXT_COOKIE, next, cookieOpts);
  return res;
}
