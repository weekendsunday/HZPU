import { Suspense } from "react";
import { ssoPublicInfo } from "@/lib/sso";
import RegisterForm from "./RegisterForm";

// SSO 开关来自环境变量，必须在请求时读取，否则会被构建期的值固化。
export const dynamic = "force-dynamic";

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="spinner">加载中…</div>}>
      <RegisterForm sso={ssoPublicInfo()} />
    </Suspense>
  );
}
