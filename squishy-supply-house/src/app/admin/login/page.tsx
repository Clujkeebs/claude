import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/admin/LoginForm";
import { Logo } from "@/components/Logo";
import { adminCount, currentAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  if (await currentAdmin()) redirect("/admin");

  // Nothing to sign in to until the first account exists.
  if ((await adminCount()) === 0) redirect("/admin/setup");

  return (
    <div className="container-page flex min-h-[70vh] items-center justify-center py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Logo height={64} />
        </div>
        <h1 className="text-center text-2xl text-plum-900">Sign in</h1>
        <div className="mt-8">
          <LoginForm />
        </div>
        <p className="mt-8 text-center text-sm text-muted">
          <Link href="/" className="underline underline-offset-4 hover:text-plum-900">
            Back to the shop
          </Link>
        </p>
      </div>
    </div>
  );
}
