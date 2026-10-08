import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import type { User, Role } from "@prisma/client";
import { prisma } from "./db";

const COOKIE_NAME = "hzpu_session";
const secret = new TextEncoder().encode(
  process.env.SESSION_SECRET || "dev-only-secret-change-me"
);

const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 天

export type SessionUser = Pick<
  User,
  "id" | "studentId" | "name" | "realName" | "role" | "status"
>;

/** 构造 SessionUser 时统一用这份 select，避免各路由漏字段。 */
export const SESSION_USER_SELECT = {
  id: true,
  studentId: true,
  name: true,
  realName: true,
  role: true,
  status: true,
} as const;

/** 会话 Cookie 名与属性；SSO 回调这类需要直接写响应的场景用它。 */
export function sessionCookie(name: string, value: string, maxAge = SESSION_MAX_AGE) {
  return {
    name,
    value,
    options: {
      httpOnly: true,
      sameSite: "lax" as const,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge,
    },
  };
}

export const SESSION_COOKIE_NAME = COOKIE_NAME;

export async function createSessionToken(user: SessionUser): Promise<string> {
  return new SignJWT({
    sub: user.id,
    sid: user.studentId,
    name: user.name,
    role: user.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret);
}

export async function setSessionCookie(user: SessionUser): Promise<void> {
  const token = await createSessionToken(user);
  const c = sessionCookie(COOKIE_NAME, token);
  cookies().set(c.name, c.value, c.options);
}

export function clearSessionCookie(): void {
  cookies().set(COOKIE_NAME, "", { httpOnly: true, path: "/", maxAge: 0 });
}

async function verifyToken(token: string): Promise<{ sub: string; role: Role } | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    if (!payload.sub) return null;
    return { sub: payload.sub, role: (payload.role as Role) || "USER" };
  } catch {
    return null;
  }
}

/** 读取当前登录用户；未登录返回 null。BANNED 用户视为未登录。 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  if (!payload) return null;
  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: SESSION_USER_SELECT,
  });
  if (!user || user.status !== "ACTIVE") return null;
  return user;
}

/** 要求登录；未登录抛 ApiError(401)。 */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new ApiError(401, "请先登录");
  return user;
}

/** 要求管理员；否则抛 ApiError(403)。 */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "ADMIN") throw new ApiError(403, "需要管理员权限");
  return user;
}

/** 统一 API 错误；路由 handler 捕获后转 JSON 响应。 */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}
