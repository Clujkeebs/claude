"use client";

import { useActionState, useState } from "react";
import { loginAction, setupAction, type ActionState } from "@/app/admin/actions";
import { Button } from "@/components/ui/Button";

function Alert({ state }: { state: ActionState }) {
  if (!state?.error) return null;
  return (
    <p
      role="alert"
      className="rounded-[--radius-card] border border-danger-700/30 bg-danger-700/5 px-4 py-3 text-sm text-danger-700"
    >
      {state.error}
    </p>
  );
}

const inputClass =
  "min-h-12 w-full rounded-[--radius-input] border border-border bg-surface px-4 text-plum-900 focus:border-plum-500";

export function LoginForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(loginAction, null);
  // React 19 resets an action form once the action settles, which would wipe a
  // correct email just because the password was wrong. Controlled, so it stays.
  const [email, setEmail] = useState("");

  return (
    <form action={action} className="flex flex-col gap-5">
      <Alert state={state} />
      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm font-medium">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="username"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClass}
        />
      </div>
      <div>
        <label htmlFor="password" className="mb-1.5 block text-sm font-medium">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={inputClass}
        />
      </div>
      <Button type="submit" size="lg" fullWidth loading={pending} loadingLabel="Signing in">
        Sign in
      </Button>
    </form>
  );
}

export function SetupForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(setupAction, null);
  const [email, setEmail] = useState("");

  return (
    <form action={action} className="flex flex-col gap-5">
      <Alert state={state} />
      <div>
        <label htmlFor="setup-email" className="mb-1.5 block text-sm font-medium">
          Your email
        </label>
        <input
          id="setup-email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="username"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClass}
        />
      </div>
      <div>
        <label htmlFor="setup-password" className="mb-1.5 block text-sm font-medium">
          Password
        </label>
        <input
          id="setup-password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={12}
          required
          className={inputClass}
        />
        <p className="mt-1.5 text-sm text-muted">At least 12 characters.</p>
      </div>
      <div>
        <label htmlFor="setup-token" className="mb-1.5 block text-sm font-medium">
          Setup token
        </label>
        <input
          id="setup-token"
          name="setupToken"
          type="password"
          autoComplete="off"
          required
          className={inputClass}
        />
        <p className="mt-1.5 text-sm text-muted">
          The ADMIN_SETUP_TOKEN value from your environment variables.
        </p>
      </div>
      <Button
        type="submit"
        size="lg"
        fullWidth
        loading={pending}
        loadingLabel="Creating account"
      >
        Create account
      </Button>
    </form>
  );
}
