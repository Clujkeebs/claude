import type { ReactNode } from "react";

export function EmptyState({
  heading,
  body,
  action,
}: {
  heading: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-[--radius-card] border border-dashed border-border bg-surface px-6 py-16 text-center">
      <div aria-hidden="true" className="mx-auto mb-5 flex justify-center gap-1.5">
        <span className="size-3 rounded-full bg-pink-500/50" />
        <span className="size-3 rounded-full bg-plum-500/50" />
        <span className="size-3 rounded-full bg-blue-500/50" />
      </div>
      <h2 className="text-xl text-plum-900">{heading}</h2>
      <p className="container-prose mt-3 text-muted">{body}</p>
      {action && <div className="mt-7 flex justify-center">{action}</div>}
    </div>
  );
}
