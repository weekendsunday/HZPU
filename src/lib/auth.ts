import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import type { User, Role } from "@prisma/client";
import { prisma } from "./db";

const COOKIE_NAME = "hzpu_session";
const secret = new TextEncoder().encode(
  process.env.SESSION_SECRET || "dev-only-secret-change-me"
);

export type SessionUser = Pick<
  User,
  "id" | "studentId" | "name" | "realName" | "role" | "status"
>;

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
  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
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
    select: {
      id: true,
      studentId: true,
      name: true,
      realName: true,
      role: true,
      status: true,
    },
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
