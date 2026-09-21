import { redirect } from "next/navigation";
import { SetupForm } from "@/components/admin/LoginForm";
import { Logo } from "@/components/Logo";
import { adminCount } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminSetupPage() {
  // One-time route. Once an administrator exists this is closed for good.
  if ((await adminCount()) > 0) redirect("/admin/login");

  return (
    <div className="container-page flex min-h-[70vh] items-center justify-center py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Logo height={64} />
        </div>
        <h1 className="text-center text-2xl text-plum-900">Create your admin account</h1>
        <p className="mt-3 text-center text-sm text-muted">
          This page works once. After the first account is created it redirects to sign
          in, so nobody else can claim the store.
        </p>
        <div className="mt-8">
          <SetupForm />
        </div>
      </div>
    </div>
  );
}
