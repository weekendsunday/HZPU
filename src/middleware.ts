import { NextRequest, NextResponse } from "next/server";
import { clientIpFromHeaders, isIntranetIp } from "@/lib/intranet";

/**
 * 仅内网访问开关，默认开启。
 * 设 INTRANET_ONLY="false" 才对外网开放 —— 那属于「对公众提供互联网信息服务」，
 * 境内服务器需自行完成 ICP 备案与公安联网备案。
 */
const INTRANET_ONLY = process.env.INTRANET_ONLY !== "false";

const BLOCK_PAGE = `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>仅限校内网访问</title></head>
<body style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'PingFang SC','Microsoft YaHei',sans-serif;background:#f6f7f9;color:#1f2329">
  <div style="max-width:520px;margin:0 auto;padding:120px 24px;text-align:center">
    <h1 style="color:#284878;font-size:22px;margin:0 0 12px">仅限校内网访问</h1>
    <p style="color:#6b7280;line-height:1.7;margin:0">
      本站只对校园内网开放。如需在校外使用，请先连接学校 VPN 后再访问。
    </p>
  </div>
</body></html>`;

export function middleware(req: NextRequest) {
  if (!INTRANET_ONLY) return NextResponse.next();

  const ip = clientIpFromHeaders(req.headers);

  // 没有代理头：请求是直接打到应用的，只可能来自内网地址。
  // 真正的边界由防火墙 / 端口绑定 / 反向代理 ACL 保证（见 README「仅校内内网部署」）。
  if (!ip) return NextResponse.next();
  if (isIntranetIp(ip)) return NextResponse.next();

  return new NextResponse(BLOCK_PAGE, {
    status: 403,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.png).*)"],
};
