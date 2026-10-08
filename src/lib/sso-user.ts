/**
 * SSO 认证通过后，把 IdP 身份落到本地账号上。
 *
 * 三种情况：
 *   1. 已绑定过（ssoProvider + ssoSubject 命中）→ 直接登录，并刷新资料
 *   2. 没绑过但学号已存在（之前用学号密码注册的）→ 绑定 SSO 身份后登录
 *   3. 全新用户 → 建档
 *
 * 注意：SSO 不提供密码，本地 passwordHash 写入一个随机值，
 * 保证「学号 + 密码」通道永远无法用猜测的密码登录这类账号。
 */
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "./db";
import { ApiError, SESSION_USER_SELECT, type SessionUser } from "./auth";
import type { SsoProfile } from "./sso";

/** 昵称下限（与注册接口的 zod 校验保持一致）。 */
const NICKNAME_MIN = 2;
const NICKNAME_MAX = 20;

/** 昵称被占用时依次尝试 base、base2、base3… */
async function uniqueNickname(base: string): Promise<string> {
  let clean = base.replace(/\s+/g, " ").trim().slice(0, NICKNAME_MAX);
  if (clean.length < NICKNAME_MIN) clean = `同学${clean}`.slice(0, NICKNAME_MAX);

  for (let i = 0; i < 50; i++) {
    const candidate = i === 0 ? clean : `${clean}${i + 1}`.slice(0, NICKNAME_MAX);
    const taken = await prisma.user.findUnique({ where: { name: candidate }, select: { id: true } });
    if (!taken) return candidate;
  }
  return `同学${crypto.randomBytes(3).toString("hex")}`;
}

/**
 * 初始昵称：优先用 IdP 返回的昵称，否则用「同学 + 学号后 4 位」。
 * 特意不默认使用真实姓名 —— 本论坛的设定是真实姓名仅本人与管理员可见，
 * 拿它当对外昵称会直接破坏这个承诺。
 */
function initialNickname(profile: SsoProfile): string {
  if (profile.nickname) return profile.nickname;
  const tail = profile.studentId.replace(/\D/g, "").slice(-4);
  return tail ? `同学${tail}` : "同学";
}

function randomPasswordHash(): string {
  return bcrypt.hashSync(crypto.randomBytes(32).toString("hex"), 10);
}

/** IdP 侧唯一标识缺失时不能建档，否则会出现「谁都能登进同一个号」。 */
function assertUsable(profile: SsoProfile): void {
  if (!profile.subject) throw new ApiError(400, "统一身份认证未返回唯一标识，无法登录");
  if (!profile.studentId) throw new ApiError(400, "统一身份认证未返回学号，无法登录");
}

export interface SsoUpsertResult {
  user: SessionUser;
  created: boolean;
  linked: boolean;
}

export async function upsertSsoUser(
  profile: SsoProfile,
  provider: string
): Promise<SsoUpsertResult> {
  assertUsable(profile);

  // SSO 同步过来的资料：真实姓名以 IdP 为准，学院/班级仅在 IdP 有值时才覆盖。
  const syncData = {
    ssoProvider: provider,
    ssoSubject: profile.subject,
    ssoSyncedAt: new Date(),
    ...(profile.realName ? { realName: profile.realName, realNameSource: "sso" } : {}),
    ...(profile.college ? { college: profile.college } : {}),
    ...(profile.className ? { className: profile.className } : {}),
  };

  const bound = await prisma.user.findFirst({
    where: { ssoProvider: provider, ssoSubject: profile.subject },
    select: { id: true, status: true },
  });
  if (bound) {
    if (bound.status === "BANNED") throw new ApiError(403, "账号已被封禁");
    const user = await prisma.user.update({
      where: { id: bound.id },
      data: syncData,
      select: SESSION_USER_SELECT,
    });
    return { user, created: false, linked: false };
  }

  const byStudentId = await prisma.user.findUnique({
    where: { studentId: profile.studentId },
    select: { id: true, status: true },
  });
  if (byStudentId) {
    if (byStudentId.status === "BANNED") throw new ApiError(403, "账号已被封禁");
    const user = await prisma.user.update({
      where: { id: byStudentId.id },
      data: syncData,
      select: SESSION_USER_SELECT,
    });
    return { user, created: false, linked: true };
  }

  // 全新用户：昵称冲突时重试，唯一约束兜底并发。
  for (let attempt = 0; attempt < 5; attempt++) {
    const name = await uniqueNickname(initialNickname(profile));
    try {
      const user = await prisma.user.create({
        data: {
          studentId: profile.studentId,
          name,
          passwordHash: randomPasswordHash(),
          ...syncData,
        },
        select: SESSION_USER_SELECT,
      });
      return { user, created: true, linked: false };
    } catch (e) {
      const code = (e as { code?: string }).code;
      // P2002 = 唯一约束冲突：学号被别人抢先建了 → 转去绑定；昵称撞了 → 换一个重试
      if (code === "P2002") {
        const target = String((e as { meta?: { target?: unknown } }).meta?.target ?? "");
        if (target.includes("student_id")) {
          const again = await prisma.user.findUnique({
            where: { studentId: profile.studentId },
            select: { id: true, status: true },
          });
          if (again && again.status !== "BANNED") {
            const user = await prisma.user.update({
              where: { id: again.id },
              data: syncData,
              select: SESSION_USER_SELECT,
            });
            return { user, created: false, linked: true };
          }
        }
        continue;
      }
      throw e;
    }
  }
  throw new ApiError(500, "昵称分配失败，请稍后重试");
}
