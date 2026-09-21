"use client";

import { useId, useState } from "react";
import { Button } from "@/components/ui/Button";
import { copy } from "@/content/copy";
import { cn } from "@/lib/cn";
import { contactSchema } from "@/lib/validation";

type Fields = { name: string; email: string; subject: string; message: string };
const initial: Fields = { name: "", email: "", subject: "", message: "" };

export function ContactForm() {
  const [values, setValues] = useState<Fields>(initial);
  const [errors, setErrors] = useState<Partial<Record<keyof Fields, string>>>({});
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [formError, setFormError] = useState<string | null>(null);
  const ids = useId();

  function set<K extends keyof Fields>(key: K, value: string) {
    setValues((v) => ({ ...v, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  }

  function validateField(key: keyof Fields) {
    const result = contactSchema.safeParse(values);
    if (result.success) return setErrors((e) => ({ ...e, [key]: undefined }));
    const issue = result.error.issues.find((i) => i.path[0] === key);
    setErrors((e) => ({ ...e, [key]: issue?.message }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const formData = new FormData(event.currentTarget);
    const payload = { ...values, website: String(formData.get("website") ?? "") };

    const result = contactSchema.safeParse(payload);
    if (!result.success) {
      const next: Partial<Record<keyof Fields, string>> = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof Fields;
        next[key] ??= issue.message;
      }
      setErrors(next);
      document.querySelector<HTMLElement>("[aria-invalid='true']")?.focus();
      return;
    }

    setStatus("sending");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        setFormError(json.error ?? copy.contact.failed);
        setStatus("error");
        return;
      }
      setValues(initial);
      setStatus("sent");
    } catch {
      setFormError(copy.contact.failed);
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <p
        role="status"
        className="rounded-[--radius-card] border border-success-700/30 bg-success-700/5 px-5 py-6 text-success-700"
      >
        {copy.contact.success}
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      {formError && (
        <p
          role="alert"
          className="rounded-[--radius-card] border border-danger-700/30 bg-danger-700/5 px-4 py-3 text-sm text-danger-700"
        >
          {formError}
        </p>
      )}

      <Field
        id={`${ids}-name`}
        label={copy.contact.name}
        value={values.name}
        autoComplete="name"
        error={errors.name}
        onChange={(v) => set("name", v)}
        onBlur={() => validateField("name")}
      />
      <Field
        id={`${ids}-email`}
        label={copy.contact.email}
        type="email"
        inputMode="email"
        autoComplete="email"
        value={values.email}
        error={errors.email}
        onChange={(v) => set("email", v)}
        onBlur={() => validateField("email")}
      />
      <Field
        id={`${ids}-subject`}
        label={copy.contact.subject}
        value={values.subject}
        error={errors.subject}
        onChange={(v) => set("subject", v)}
        onBlur={() => validateField("subject")}
      />

      <div>
        <label htmlFor={`${ids}-message`} className="mb-1.5 block text-sm font-medium">
          {copy.contact.message}
        </label>
        <textarea
          id={`${ids}-message`}
          rows={7}
          value={values.message}
          onChange={(e) => set("message", e.target.value)}
          onBlur={() => validateField("message")}
          aria-invalid={errors.message ? "true" : undefined}
          aria-describedby={errors.message ? `${ids}-message-error` : undefined}
          className={cn(
            "w-full rounded-[--radius-input] border bg-surface p-4 text-plum-900",
            errors.message ? "border-danger-700" : "border-border focus:border-plum-500",
          )}
        />
        {errors.message && (
          <p id={`${ids}-message-error`} className="mt-1.5 text-sm text-danger-700">
            {errors.message}
          </p>
        )}
      </div>

      {/* Honeypot. Hidden from people, irresistible to bots. */}
      <div aria-hidden="true" className="absolute left-[-9999px] h-px w-px overflow-hidden">
        <label htmlFor={`${ids}-website`}>Leave this empty</label>
        <input id={`${ids}-website`} name="website" tabIndex={-1} autoComplete="off" />
      </div>

      <div>
        <Button
          type="submit"
          size="lg"
          loading={status === "sending"}
          loadingLabel={copy.contact.submitting}
        >
          {copy.contact.submit}
        </Button>
      </div>
    </form>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  onBlur,
  error,
  ...rest
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  error?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "onBlur" | "value" | "id">) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium">
        {label}
      </label>
      <input
        {...rest}
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        aria-invalid={error ? "true" : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={cn(
          "min-h-12 w-full rounded-[--radius-input] border bg-surface px-4 text-plum-900",
          error ? "border-danger-700" : "border-border focus:border-plum-500",
        )}
      />
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-sm text-danger-700">
          {error}
        </p>
      )}
    </div>
  );
}
