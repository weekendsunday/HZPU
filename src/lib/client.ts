/** 浏览器端 API 封装：自动 JSON、携带 cookie、统一错误处理。 */

export interface ApiOptions extends Omit<RequestInit, "body" | "method"> {
  method?: string;
  /** 对象时自动 JSON.stringify 并设置 Content-Type。 */
  body?: unknown;
}

/** 调用站内 API，自动解包 { ok, data } 信封；失败时 throw Error(error)。 */
export async function api<T = unknown>(path: string, opts: ApiOptions = {}): Promise<T> {
  const { body, headers, ...rest } = opts;
  const init: RequestInit = {
    credentials: "same-origin",
    ...rest,
    headers: { ...headers },
  };
  if (body !== undefined) {
    if (body instanceof FormData || typeof body === "string") {
      init.body = body as BodyInit;
    } else {
      init.body = JSON.stringify(body);
      (init.headers as Record<string, string>)["Content-Type"] = "application/json";
    }
  }
  const res = await fetch(path, init);
  let payload: unknown = null;
  try {
    payload = await res.json();
  } catch {
    // 非 JSON 响应
  }
  if (payload && typeof payload === "object" && "ok" in payload) {
    const env = payload as { ok: boolean; data?: unknown; error?: string };
    if (env.ok) return env.data as T;
    throw new Error(env.error || "请求失败");
  }
  throw new Error(`请求失败（HTTP ${res.status}）`);
}

/** 相对时间：x秒前 / x分钟前 / x小时前 / x天前；超过 7 天返回 YYYY-MM-DD。 */
export function fmtTime(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const diff = Date.now() - t;
  if (diff < 0) return formatDate(iso);
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diff < minute) return "刚刚";
  if (diff < hour) return `${Math.floor(diff / minute)} 分钟前`;
  if (diff < day) return `${Math.floor(diff / hour)} 小时前`;
  if (diff < 7 * day) return `${Math.floor(diff / day)} 天前`;
  return formatDate(iso);
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export interface SessionUser {
  id: string;
  studentId: string;
  name: string;
  /** 本人真实姓名；仅自己与管理员可见。 */
  realName?: string;
  role: "USER" | "ADMIN";
  status: string;
}

/** 读取当前登录用户；未登录返回 null（不抛错）。 */
export async function getClientUser(): Promise<SessionUser | null> {
  try {
    const data = await api<{ user: SessionUser }>("/api/auth/me");
    return data.user;
  } catch {
    return null;
  }
}
