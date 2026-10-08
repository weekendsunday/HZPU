import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const BOARDS = [
  { slug: "general", name: "综合讨论" },
  { slug: "campus", name: "校园生活" },
  { slug: "study", name: "学习交流" },
  { slug: "market", name: "二手交易" },
  { slug: "lostfound", name: "失物招领" },
];

const SENSITIVE_WORDS = [
  "法轮功",
  "法轮大法",
  "枪支",
  "毒品",
  "冰毒",
  "海洛因",
  "摇头丸",
  "大麻",
  "鸦片",
  "赌博",
  "嫖娼",
  "卖淫",
  "诈骗",
  "传销",
  "走私",
  "恐怖袭击",
  "爆炸物",
  "假币",
  "器官买卖",
  "自杀",
];

async function main() {
  const adminStudentId = process.env.ADMIN_STUDENT_ID || "000000000001";
  const adminName = process.env.ADMIN_NAME || "管理员";
  const adminPassword = process.env.ADMIN_PASSWORD || "admin123456";

  const passwordHash = await bcrypt.hash(adminPassword, 10);

  const admin = await prisma.user.upsert({
    where: { studentId: adminStudentId },
    update: {
      name: adminName,
      passwordHash,
      role: "ADMIN",
      status: "ACTIVE",
    },
    create: {
      studentId: adminStudentId,
      name: adminName,
      passwordHash,
      role: "ADMIN",
      status: "ACTIVE",
    },
  });

  const boards = [];
  for (const b of BOARDS) {
    boards.push(
      await prisma.board.upsert({
        where: { slug: b.slug },
        update: { name: b.name },
        create: { slug: b.slug, name: b.name },
      })
    );
  }

  const words = [];
  for (const w of SENSITIVE_WORDS) {
    words.push(
      await prisma.sensitiveWord.upsert({
        where: { word: w },
        update: {},
        create: { word: w },
      })
    );
  }

  console.log("Seed 完成:");
  console.log(`- 管理员: ${admin.name} (${admin.studentId}) role=${admin.role}`);
  console.log(`- 版块 (${boards.length}): ${boards.map((b) => `${b.name}(${b.slug})`).join(", ")}`);
  console.log(`- 敏感词 (${words.length}): ${words.map((w) => w.word).join(", ")}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
