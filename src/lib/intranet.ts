/**
 * 内网判定：RFC1918 私网、环回、链路本地、CGNAT、IPv6 ULA。
 * 供 middleware 与文档共用，纯函数、无运行时依赖（middleware 跑在 Edge Runtime）。
 */

/** 去掉 IPv4 可能附带的端口："10.0.0.1:51234" -> "10.0.0.1"。 */
function stripPort(value: string): string {
  const v = value.trim().replace(/^\[|\]$/g, "");
  const v4 = v.match(/^(\d+\.\d+\.\d+\.\d+):\d+$/);
  return v4 ? v4[1] : v;
}

/**
 * 从代理头取来源 IP；无任何代理头时返回 null。
 *
 * 顺序：X-Real-IP 优先，其次 X-Forwarded-For 最左侧（原始客户端）。
 * 反向代理必须用 $remote_addr 覆写这两个头（见 deploy/nginx-intranet.conf.example），
 * 否则客户端可以自己伪造 —— 所以这里只是兜底判定，真正的边界由防火墙 / ACL 保证。
 *
 * 注意：next start / standalone 的 HTTP 层在请求不带 X-Forwarded-For 时会自行注入
 * 直连对端地址（本机即 ::ffff:127.0.0.1），因此「没有代理头」这个分支正常不会走到。
 */
export function clientIpFromHeaders(headers: Headers): string | null {
  const real = headers.get("x-real-ip");
  if (real && stripPort(real)) return stripPort(real);

  const xff = headers.get("x-forwarded-for");
  if (xff) {
    for (const part of xff.split(",")) {
      const ip = stripPort(part);
      if (ip) return ip;
    }
  }
  return null;
}

/** 该 IP 是否属于内网/本机地址。 */
export function isIntranetIp(raw: string): boolean {
  const ip = raw.trim().toLowerCase().replace(/^\[|\]$/g, "");
  if (!ip) return false;

  if (ip.includes(":")) {
    if (ip === "::1") return true;
    // IPv4-mapped：::ffff:10.0.0.1
    const mapped = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isIntranetIp(mapped[1]);
    const first = parseInt(ip.split(":")[0] || "0", 16);
    if (Number.isNaN(first)) return false;
    if ((first & 0xfe00) === 0xfc00) return true; // fc00::/7 唯一本地地址
    if ((first & 0xffc0) === 0xfe80) return true; // fe80::/10 链路本地
    return false;
  }

  const parts = ip.split(".").map((n) => Number.parseInt(n, 10));
  if (parts.length !== 4) return false;
  if (parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return false;

  const [a, b] = parts;
  if (a === 10) return true; // 10.0.0.0/8
  if (a === 127) return true; // 环回
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
  if (a === 192 && b === 168) return true; // 192.168.0.0/16
  if (a === 169 && b === 254) return true; // 链路本地
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT 100.64.0.0/10
  return false;
}
