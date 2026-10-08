/**
 * SSO 失败原因码 → 用户看得懂的话。
 * 客户端组件与服务端共用，因此这里不能引入 node 专属依赖。
 */
export const SSO_ERROR_MESSAGES: Record<string, string> = {
  disabled: "学校统一身份认证尚未启用，请改用学号密码登录",
  state: "认证会话已失效（可能是页面停留过久），请重新点击认证按钮",
  denied: "你取消了统一身份认证授权",
  no_ticket: "统一身份认证未返回票据，请重试",
  no_code: "统一身份认证未返回授权码，请重试",
  validate_failed: "统一身份认证校验失败，票据可能已过期，请重试",
  profile: "统一身份认证未返回学号或姓名，请联系学校网络信息中心",
  banned: "该账号已被封禁",
  server: "服务器处理认证结果时出错，请稍后重试",
};

export function ssoErrorMessage(code: string | null | undefined): string {
  if (!code) return "";
  return SSO_ERROR_MESSAGES[code] ?? `统一身份认证失败（${code}）`;
}

export interface SsoPublicInfo {
  enabled: boolean;
  label: string;
  protocol: "cas" | "oauth2";
}
