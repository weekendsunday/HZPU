import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { ApiError } from "./auth";

export function ok<T>(data: T, init?: ResponseInit): NextResponse {
  return NextResponse.json({ ok: true, data }, init);
}

/** 统一错误出口：ApiError -> 对应状态码；ZodError -> 422；其余 -> 500。 */
export function fail(e: unknown): NextResponse {
  if (e instanceof ApiError) {
    return NextResponse.json({ ok: false, error: e.message }, { status: e.status });
  }
  if (e instanceof ZodError) {
    return NextResponse.json(
      { ok: false, error: "参数不合法", details: e.flatten() },
      { status: 422 }
    );
  }
  console.error(e);
  return NextResponse.json({ ok: false, error: "服务器内部错误" }, { status: 500 });
}

/**
 * 包装路由 handler，自动统一错误格式。
 * 显式参数类型让 TS 能向下推断各 route 的 (req, ctx)。
 */
export function handle<P = { params: Record<string, string> }>(
  fn: (req: NextRequest, ctx: P) => Promise<NextResponse>
): (req: NextRequest, ctx: P) => Promise<NextResponse> {
  return async (req, ctx) => {
    try {
      return await fn(req, ctx);
    } catch (e) {
      return fail(e);
    }
  };
}

export interface PageQuery {
  page: number;
  pageSize: number;
  skip: number;
}

/** 解析 ?page=&pageSize=，page 从 1 开始，pageSize 上限 50。 */
export function parsePage(searchParams: URLSearchParams): PageQuery {
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
  const pageSize = Math.min(
    50,
    Math.max(1, parseInt(searchParams.get("pageSize") || "20", 10) || 20)
  );
  return { page, pageSize, skip: (page - 1) * pageSize };
}
