import { BrandMark } from "@/components/BrandMark";
import { LoginBackdrop } from "@/components/LoginBackdrop";
import { LoginForm } from "@/components/LoginForm";
import { ar } from "@/i18n/ar";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <div className="fixed inset-0 bg-navy-900 flex items-center justify-center overflow-hidden">
      <LoginBackdrop />
      <div className="relative flex flex-col items-center gap-3.5 w-[400px]">
        <BrandMark size={64} />
        <div dir="ltr" className="text-white text-2xl font-semibold tracking-[.02em] leading-none mb-[18px]">
          {ar.brand}
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
