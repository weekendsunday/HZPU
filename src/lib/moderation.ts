import { prisma } from "./db";

export type ModerationVerdict = { pass: true } | { pass: false; reason: string };

/**
 * 内容审核管线：先本地敏感词库，过了再调可选 LLM agent。
 * 两层都过 -> 发布；任一层拒绝 -> 进入人工审核队列（status=PENDING 由调用方决定）。
 *
 * 调用方式：const verdict = await moderate("POST", title + "\n" + body)
 */
export async function moderate(text: string): Promise<ModerationVerdict> {
  const kw = await keywordCheck(text);
  if (!kw.pass) return kw;
  if (process.env.MODERATION_LLM_URL) {
    return llmCheck(text);
  }
  return { pass: true };
}

async function keywordCheck(text: string): Promise<ModerationVerdict> {
  const words = await prisma.sensitiveWord.findMany({ select: { word: true } });
  const lower = text.toLowerCase();
  for (const { word } of words) {
    if (word && lower.includes(word.toLowerCase())) {
      return { pass: false, reason: `命中敏感词：${word}` };
    }
  }
  return { pass: true };
}

/**
 * 可选 LLM 审核 agent：向本地模型服务（如 Ollama）发文本，
 * 要求返回 JSON {"pass": true} 或 {"pass": false, "reason": "..."}。
 * LLM 不可达时保守起见不拦截（避免误杀），仅记日志。
 */
async function llmCheck(text: string): Promise<ModerationVerdict> {
  const url = process.env.MODERATION_LLM_URL!;
  const model = process.env.MODERATION_LLM_MODEL || "default";
  const prompt = `你是校园论坛内容审核员。判断以下帖子内容是否适合公开发布（禁止：违法、色情、暴力、人身攻击、广告刷屏）。只返回 JSON：{"pass": true} 或 {"pass": false, "reason": "简短原因"}。\n\n内容：\n${text.slice(0, 4000)}`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, prompt, stream: false }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return { pass: true };
    const data = (await res.json()) as { response?: string };
    const parsed = JSON.parse(
      (data.response || "").replace(/```json|```/g, "").trim()
    ) as { pass?: boolean; reason?: string };
    if (parsed.pass === false) {
      return { pass: false, reason: parsed.reason || "AI 审核未通过" };
    }
    return { pass: true };
  } catch (e) {
    console.warn("LLM moderation unavailable, skipped:", e);
    return { pass: true };
  }
}
