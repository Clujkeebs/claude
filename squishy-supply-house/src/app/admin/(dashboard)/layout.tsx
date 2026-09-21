import Link from "next/link";
import { redirect } from "next/navigation";
import { logoutAction } from "@/app/admin/actions";
import { AdminNav } from "@/components/admin/AdminNav";
import { currentAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await currentAdmin();
  if (!admin) redirect("/admin/login");

  return (
    <div className="container-page py-8 md:py-10">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-2xl text-plum-900">Admin</h1>
          <p className="mt-1 text-sm text-muted">{admin.email}</p>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="text-sm text-muted underline underline-offset-4 hover:text-plum-900"
          >
            View shop
          </Link>
          <form action={logoutAction}>
            <button
              type="submit"
              className="min-h-11 rounded-[--radius-input] border border-border bg-surface px-4 text-sm font-medium transition-colors hover:border-plum-500"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>

      <AdminNav />

      <div className="mt-8">{children}</div>
    </div>
  );
}
