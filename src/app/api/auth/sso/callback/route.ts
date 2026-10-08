import { NextRequest, NextResponse } from "next/server";
import {
  callbackUrl,
  exchangeOAuthCodeForProfile,
  safeNextPath,
  ssoConfig,
  ssoEnabled,
  validateCasTicket,
  SSO_NEXT_COOKIE,
  SSO_STATE_COOKIE,
} from "@/lib/sso";
import { upsertSsoUser } from "@/lib/sso-user";
import {
  ApiError,
  createSessionToken,
  SESSION_COOKIE_NAME,
  sessionCookie,
} from "@/lib/auth";

export const dynamic = "force-dynamic";

/** 认证失败一律回登录页并带上原因码，页面再翻成人话。 */
function backToLogin(req: NextRequest, code: string, next?: string): NextResponse {
  const url = new URL("/login", req.url);
  url.searchParams.set("sso_error", code);
  if (next && next !== "/") url.searchParams.set("next", next);
  const res = NextResponse.redirect(url);
  res.cookies.set(SSO_STATE_COOKIE, "", { path: "/", maxAge: 0 });
  res.cookies.set(SSO_NEXT_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}

export async function GET(req: NextRequest) {
  const cfg = ssoConfig();
  if (!ssoEnabled()) return backToLogin(req, "disabled");

  const next = safeNextPath(req.cookies.get(SSO_NEXT_COOKIE)?.value ?? null);
  const params = req.nextUrl.searchParams;

  // IdP 侧直接拒绝（用户点了取消 / 未授权）
  if (params.get("error")) return backToLogin(req, "denied", next);

  const redirectUri = callbackUrl(cfg, req.headers, req.nextUrl.origin);

  let profile;
  if (cfg.protocol === "cas") {
    const ticket = params.get("ticket");
    if (!ticket) return backToLogin(req, "no_ticket", next);
    try {
      profile = await validateCasTicket(cfg, redirectUri, ticket);
    } catch (e) {
      console.error("[sso] CAS 校验失败", e);
      return backToLogin(req, "validate_failed", next);
    }
  } else {
    // OAuth2 必须校验 state，防 CSRF
    const expected = req.cookies.get(SSO_STATE_COOKIE)?.value ?? "";
    const got = params.get("state") ?? "";
    if (!expected || !got || expected !== got) return backToLogin(req, "state", next);

    const code = params.get("code");
    if (!code) return backToLogin(req, "no_code", next);
    try {
      profile = await exchangeOAuthCodeForProfile(cfg, redirectUri, code);
    } catch (e) {
      console.error("[sso] OAuth2 换取资料失败", e);
      return backToLogin(req, "validate_failed", next);
    }
  }

  try {
    const { user } = await upsertSsoUser(profile, cfg.protocol);
    const token = await createSessionToken(user);
    const res = NextResponse.redirect(new URL(next, req.url));
    const c = sessionCookie(SESSION_COOKIE_NAME, token);
    res.cookies.set(c.name, c.value, c.options);
    res.cookies.set(SSO_STATE_COOKIE, "", { path: "/", maxAge: 0 });
    res.cookies.set(SSO_NEXT_COOKIE, "", { path: "/", maxAge: 0 });
    return res;
  } catch (e) {
    if (e instanceof ApiError && e.status === 403) return backToLogin(req, "banned", next);
    if (e instanceof ApiError && e.status === 400) return backToLogin(req, "profile", next);
    console.error("[sso] 本地建档失败", e);
    return backToLogin(req, "server", next);
  }
}
