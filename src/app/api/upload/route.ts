import { NextRequest } from "next/server";
import path from "path";
import fs from "fs/promises";
import crypto from "crypto";
import { prisma } from "@/lib/db";
import { requireUser, ApiError } from "@/lib/auth";
import { ok, handle } from "@/lib/api";

const MAX_SIZE = 5 * 1024 * 1024; // 5MB

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpeg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/avif": "avif",
};

export const POST = handle(async (req: NextRequest) => {
  const user = await requireUser();

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) throw new ApiError(400, "缺少文件字段 file");

  if (!file.type.startsWith("image/")) {
    throw new ApiError(415, "仅支持图片文件");
  }
  const ext = EXT_BY_MIME[file.type];
  if (!ext) throw new ApiError(415, "不支持的图片格式");
  if (file.size > MAX_SIZE) throw new ApiError(413, "文件超过 5MB 限制");

  const now = new Date();
  const yyyy = String(now.getFullYear());
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const root = path.join(process.cwd(), process.env.UPLOAD_DIR || "uploads");
  const dir = path.join(root, yyyy, mm);
  await fs.mkdir(dir, { recursive: true });

  const name = `${crypto.randomUUID()}.${ext}`;
  await fs.writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));

  await prisma.image.create({
    data: {
      uploaderId: user.id,
      fileName: `${yyyy}/${mm}/${name}`,
      mime: file.type,
      size: file.size,
    },
  });

  return ok({ url: `/api/uploads/${yyyy}/${mm}/${name}` });
});
