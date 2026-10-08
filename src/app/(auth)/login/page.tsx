import { Suspense } from "react";
import { ssoPublicInfo } from "@/lib/sso";
import LoginForm from "./LoginForm";

// SSO 开关来自环境变量，必须在请求时读取，否则会被构建期的值固化。
export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="spinner">加载中…</div>}>
      <LoginForm sso={ssoPublicInfo()} />
    </Suspense>
  );
}
