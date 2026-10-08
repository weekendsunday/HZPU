import type { SessionUser } from "./auth";

export interface AuthorInput {
  id: string;
  name: string;
  realName?: string | null;
}

export interface AuthorView {
  id: string;
  name: string;
  /** 真实姓名：仅本人与管理员能拿到，其余人该字段缺省。 */
  realName?: string;
}

/**
 * 作者信息可见性裁剪。
 * 昵称（name）对所有人公开；真实姓名（realName）仅本人与管理员可见，
 * 未设置真实姓名时不输出该字段。
 */
export function authorView(
  author: AuthorInput,
  viewer: SessionUser | null | undefined
): AuthorView {
  const allowed = !!viewer && (viewer.id === author.id || viewer.role === "ADMIN");
  const view: AuthorView = { id: author.id, name: author.name };
  if (allowed && author.realName) view.realName = author.realName;
  return view;
}
