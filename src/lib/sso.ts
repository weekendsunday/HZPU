/**
 * 学校统一身份认证（SSO）接入层 —— 预留接口。
 *
 * 「预留」的含义：学校网络信息中心把地址、client_id / client_secret、属性名给我们之后，
 * 只改 .env 就能启用，不需要动代码。未配置时整条 SSO 链路关闭，登录/注册页退回学号+密码。
 *
 * 支持两种协议，用 SSO_PROTOCOL 切换：
 *   cas    CAS 2.0/3.0（国内高校最常见）：/login?service=… → /serviceValidate?ticket=…
 *   oauth2 OAuth 2.0 / OIDC：/oauth/authorize → /oauth/token → userinfo
 *
 * 本文件只在服务端（route handler / server component）使用，不可被客户端组件 import。
 */
import crypto from "node:crypto";

export type SsoProtocol = "cas" | "oauth2";

/** 从 IdP 拿到的用户资料，字段名已按 SSO_ATTR_* 映射成我们自己的语义。 */
export interface SsoProfile {
  /** IdP 内唯一标识，用于绑定本地账号 */
  subject: string;
  studentId: string;
  realName: string;
  nickname: string;
  college: string;
  className: string;
  /** IdP 原始属性，便于排查与后续扩展 */
  raw: Record<string, string>;
}

export interface SsoConfig {
  enabled: boolean;
  protocol: SsoProtocol;
  baseUrl: string;
  loginPath: string;
  validatePath: string;
  tokenPath: string;
  userinfoPath: string;
  clientId: string;
  clientSecret: string;
  scope: string;
  /** 留空则按当前请求的 Host 推导为 <origin>/api/auth/sso/callback */
  redirectUri: string;
  label: string;
  /** 校内自签证书场景：跳过 TLS 校验（仅限内网自建 IdP） */
  insecureTls: boolean;
  attrs: {
    studentId: string;
    realName: string;
    nickname: string;
    college: string;
    className: string;
  };
}

/** 读取环境变量；留空视为未设置，回落到默认值（.env 里「留空 = 用默认」的写法即依赖此行为）。 */
function env(name: string, fallback = ""): string {
  const v = (process.env[name] ?? "").trim();
  return v.length > 0 ? v : fallback;
}

function isTrue(v: string): boolean {
  return ["1", "true", "yes", "on"].includes(v.toLowerCase());
}

export function ssoConfig(): SsoConfig {
  const protocol: SsoProtocol = env("SSO_PROTOCOL", "cas").toLowerCase() === "oauth2" ? "oauth2" : "cas";
  const cas = protocol === "cas";
  return {
    enabled: isTrue(env("SSO_ENABLED", "false")),
    protocol,
    baseUrl: env("SSO_BASE_URL"),
    loginPath: env("SSO_LOGIN_PATH", cas ? "/login" : "/oauth/authorize"),
    validatePath: env("SSO_VALIDATE_PATH", "/serviceValidate"),
    tokenPath: env("SSO_TOKEN_PATH", "/oauth/token"),
    userinfoPath: env("SSO_USERINFO_PATH", "/oauth/userinfo"),
    clientId: env("SSO_CLIENT_ID"),
    clientSecret: env("SSO_CLIENT_SECRET"),
    scope: env("SSO_SCOPE", "openid profile"),
    redirectUri: env("SSO_REDIRECT_URI"),
    label: env("SSO_LABEL", "学校统一身份认证"),
    insecureTls: isTrue(env("SSO_TLS_INSECURE", "false")),
    attrs: {
      studentId: env("SSO_ATTR_STUDENT_ID", "studentId"),
      realName: env("SSO_ATTR_REAL_NAME", "realName"),
      nickname: env("SSO_ATTR_NICKNAME", "nickname"),
      college: env("SSO_ATTR_COLLEGE", "college"),
      className: env("SSO_ATTR_CLASS_NAME", "className"),
    },
  };
}

/** 是否具备启用条件：开关打开 + 配了 IdP 地址。 */
export function ssoEnabled(): boolean {
  const cfg = ssoConfig();
  return cfg.enabled && cfg.baseUrl.length > 0;
}

/** 供页面展示的最少信息（绝不下发 client_secret）。 */
export function ssoPublicInfo(): { enabled: boolean; label: string; protocol: SsoProtocol } {
  const cfg = ssoConfig();
  return { enabled: ssoEnabled(), label: cfg.label, protocol: cfg.protocol };
}

export function newState(): string {
  return crypto.randomBytes(16).toString("hex");
}

/** 暂存 SSO 往返过程的 Cookie：state 用于防 CSRF，next 用于认证后回跳。 */
export const SSO_STATE_COOKIE = "hzpu_sso_state";
export const SSO_NEXT_COOKIE = "hzpu_sso_next";

/** 只接受站内相对路径，避免被当成开放重定向。 */
export function safeNextPath(raw: string | null | undefined): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/";
  return raw;
}

/**
 * 从代理头推导对外可访问的 origin。
 * 反代场景必须透传 X-Forwarded-Proto / X-Forwarded-Host，否则回调地址会拼错。
 */
export function requestOrigin(headers: Headers, fallback: string): string {
  const host = headers.get("x-forwarded-host") || headers.get("host");
  if (!host) return fallback;
  const proto =
    (headers.get("x-forwarded-proto") || "").split(",")[0].trim() ||
    new URL(fallback).protocol.replace(":", "");
  return `${proto}://${host.split(",")[0].trim()}`;
}

/** 回调地址：优先用 SSO_REDIRECT_URI（必须与 IdP 侧登记的一致）。 */
export function callbackUrl(cfg: SsoConfig, headers: Headers, fallbackOrigin: string): string {
  return cfg.redirectUri || `${requestOrigin(headers, fallbackOrigin)}/api/auth/sso/callback`;
}

/** 拼授权跳转地址。 */
export function buildAuthorizeUrl(cfg: SsoConfig, redirectUri: string, state: string): string {
  const url = new URL(cfg.loginPath, cfg.baseUrl);
  if (cfg.protocol === "cas") {
    url.searchParams.set("service", redirectUri);
  } else {
    url.searchParams.set("response_type", "code");
    url.searchParams.set("client_id", cfg.clientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("scope", cfg.scope);
    url.searchParams.set("state", state);
  }
  return url.toString();
}

async function ssoFetch(url: string, init: RequestInit, insecureTls: boolean): Promise<Response> {
  const opts: RequestInit = { ...init, cache: "no-store" };
  if (!insecureTls) return fetch(url, opts);

  // 校内自签证书：仅在内网自建 IdP 时打开，Node 的该开关是进程级的，用完立刻还原。
  const prev = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  try {
    return await fetch(url, opts);
  } finally {
    if (prev === undefined) delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
    else process.env.NODE_TLS_REJECT_UNAUTHORIZED = prev;
  }
}

// ---------- CAS ----------

function decodeXml(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, d: string) => String.fromCodePoint(Number(d)))
    .replace(/&amp;/g, "&");
}

/**
 * 取某个标签的文本内容，容忍 cas: / ns0: 之类的前缀。
 * 只用于 CAS serviceValidate 这种结构固定的响应，不当作通用 XML 解析器。
 */
function pickTag(xml: string, tag: string): string {
  const re = new RegExp(
    `<(?:[\\w.-]+:)?${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</(?:[\\w.-]+:)?${tag}>`,
    "i"
  );
  const m = xml.match(re);
  return m ? decodeXml(m[1]).trim() : "";
}

/** 解析 CAS 3.0 的 <cas:attributes> 子元素，得到属性名 -> 值。 */
function parseCasAttributes(xml: string): Record<string, string> {
  const block = xml.match(
    /<(?:[\w.-]+:)?attributes(?:\s[^>]*)?>([\s\S]*?)<\/(?:[\w.-]+:)?attributes>/i
  );
  if (!block) return {};
  const out: Record<string, string> = {};
  const re = /<([\w.-]+)(?:\s[^>]*)?>([\s\S]*?)<\/\1>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(block[1])) !== null) {
    const rawName = m[1];
    const name = rawName.includes(":") ? rawName.split(":").pop()! : rawName;
    out[name] = decodeXml(m[2]).trim();
  }
  return out;
}

/** 用 ticket 向 CAS 服务端校验，返回用户资料。 */
export async function validateCasTicket(
  cfg: SsoConfig,
  redirectUri: string,
  ticket: string
): Promise<SsoProfile> {
  const url = new URL(cfg.validatePath, cfg.baseUrl);
  url.searchParams.set("service", redirectUri);
  url.searchParams.set("ticket", ticket);

  const res = await ssoFetch(url.toString(), {}, cfg.insecureTls);
  const xml = await res.text();
  if (!res.ok) throw new Error(`CAS 校验请求失败：HTTP ${res.status}`);

  if (/<(?:[\w.-]+:)?authenticationFailure/i.test(xml)) {
    const reason = pickTag(xml, "authenticationFailure");
    throw new Error(`CAS 认证失败：${reason || "票据无效或已过期"}`);
  }

  const subject = pickTag(xml, "user");
  if (!subject) throw new Error("CAS 响应中缺少 <cas:user>");

  const attrs = { ...parseCasAttributes(xml), user: subject };
  return profileFromAttributes(attrs, cfg, subject);
}

// ---------- OAuth 2.0 / OIDC ----------

async function exchangeOAuthCode(
  cfg: SsoConfig,
  redirectUri: string,
  code: string
): Promise<string> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: cfg.clientId,
    client_secret: cfg.clientSecret,
  });
  const res = await ssoFetch(
    new URL(cfg.tokenPath, cfg.baseUrl).toString(),
    {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
      body,
    },
    cfg.insecureTls
  );
  const text = await res.text();
  if (!res.ok) throw new Error(`换取 token 失败：HTTP ${res.status} ${text.slice(0, 200)}`);
  let json: Record<string, unknown>;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error("token 端点未返回 JSON");
  }
  const token = json.access_token;
  if (typeof token !== "string" || !token) throw new Error("token 响应里没有 access_token");
  return token;
}

async function fetchOAuthUserinfo(cfg: SsoConfig, accessToken: string): Promise<Record<string, string>> {
  const res = await ssoFetch(
    new URL(cfg.userinfoPath, cfg.baseUrl).toString(),
    { headers: { authorization: `Bearer ${accessToken}`, accept: "application/json" } },
    cfg.insecureTls
  );
  const text = await res.text();
  if (!res.ok) throw new Error(`读取用户信息失败：HTTP ${res.status} ${text.slice(0, 200)}`);

  let json: Record<string, unknown>;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error("userinfo 端点未返回 JSON");
  }
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(json)) {
    if (typeof v === "string" || typeof v === "number") out[k] = String(v);
  }
  return out;
}

/** 用授权码换取用户资料。 */
export async function exchangeOAuthCodeForProfile(
  cfg: SsoConfig,
  redirectUri: string,
  code: string
): Promise<SsoProfile> {
  const token = await exchangeOAuthCode(cfg, redirectUri, code);
  const raw = await fetchOAuthUserinfo(cfg, token);
  const subject = raw.sub || raw.userid || raw.uid || "";
  if (!subject) throw new Error("userinfo 里缺少 sub / uid，无法唯一标识用户");
  return profileFromAttributes(raw, cfg, subject);
}

// ---------- 属性映射 ----------

function pick(attrs: Record<string, string>, key: string): string {
  if (!key) return "";
  const hit = attrs[key];
  return typeof hit === "string" ? hit.trim() : "";
}

/** 按 SSO_ATTR_* 把 IdP 原始属性映射成 SsoProfile。 */
export function profileFromAttributes(
  attrs: Record<string, string>,
  cfg: SsoConfig,
  subject: string
): SsoProfile {
  return {
    subject,
    studentId: pick(attrs, cfg.attrs.studentId) || subject,
    realName: pick(attrs, cfg.attrs.realName),
    nickname: pick(attrs, cfg.attrs.nickname),
    college: pick(attrs, cfg.attrs.college),
    className: pick(attrs, cfg.attrs.className),
    raw: attrs,
  };
}
