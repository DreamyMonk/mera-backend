import Image from "next/image";
import Link from "next/link";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";

// accounts.dreamymonk.xyz is branded OneAuth (dreamymonk's sign-in); Mira, the
// app people sign in to, appears as its puppy mascot.

export function OneAuthMark({ size = 32 }: { size?: number }) {
  return <Image src="/oneauth-mark.png" alt="" width={size} height={size} priority aria-hidden />;
}

// The full lockup: shield, "one auth" and "by dreamymonk".
export function OneAuthLogo({ width = 180 }: { width?: number }) {
  return <Image src="/oneauth-logo.png" alt="OneAuth by dreamymonk" width={width} height={Math.round(width * 0.733)} priority />;
}

export function MiraLogo({ size = 36 }: { size?: number }) {
  return <Image src="/mira-puppy.png" alt="" width={size} height={size} aria-hidden />;
}

export function Brand({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2" aria-label="OneAuth by dreamymonk">
      <OneAuthMark size={30} />
      <Image src="/oneauth-wordmark.png" alt="" width={102} height={19} priority aria-hidden />
    </Link>
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "danger"; busy?: boolean };

export function Button({ variant = "primary", busy, className = "", children, disabled, ...rest }: ButtonProps) {
  const styles = {
    primary: "bg-gradient-to-br from-[#2f80ff] to-[#0b47d1] text-white shadow-md shadow-blue-500/25 hover:brightness-110",
    ghost: "border border-zinc-200 bg-white text-zinc-800 hover:border-blue-400 hover:text-blue-700",
    danger: "bg-red-600 text-white hover:bg-red-700",
  }[variant];
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${styles} ${className}`}
      disabled={disabled || busy}
      {...rest}
    >
      {busy && <Spinner />}
      {children}
    </button>
  );
}

export function Spinner() {
  return <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />;
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm ${className}`}>{children}</div>;
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium text-zinc-800">{label}</span>
      {children}
      {hint && <span className="text-xs text-zinc-500">{hint}</span>}
    </label>
  );
}

const inputClass = "w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100";

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputClass} ${props.className || ""}`} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${inputClass} ${props.className || ""}`} />;
}

export function Alert({ tone = "error", children }: { tone?: "error" | "success" | "info"; children: ReactNode }) {
  const styles = { error: "border-red-200 bg-red-50 text-red-700", success: "border-emerald-200 bg-emerald-50 text-emerald-700", info: "border-blue-200 bg-blue-50 text-blue-800" }[tone];
  return <div className={`rounded-xl border px-4 py-3 text-sm ${styles}`}>{children}</div>;
}

export function Badge({ tone = "neutral", children }: { tone?: "neutral" | "good" | "bad" | "accent"; children: ReactNode }) {
  const styles = { neutral: "bg-zinc-100 text-zinc-700", good: "bg-emerald-50 text-emerald-700", bad: "bg-red-50 text-red-700", accent: "bg-blue-50 text-blue-700" }[tone];
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${styles}`}>{children}</span>;
}

export function UsageBar({ used, quota }: { used: number; quota: number }) {
  const pct = quota > 0 ? Math.min(100, (used / quota) * 100) : 100;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="h-2.5 overflow-hidden rounded-full bg-zinc-100">
        <div className={`h-full rounded-full ${pct >= 90 ? "bg-red-500" : "bg-gradient-to-r from-[#2f80ff] to-[#0b47d1]"}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="flex justify-between text-xs text-zinc-500">
        <span>{Math.round(pct)}% used</span>
        <span>
          ${used.toFixed(2)} of ${quota.toFixed(2)}
        </span>
      </div>
    </div>
  );
}

export function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-[radial-gradient(ellipse_at_top,_#e8f1ff_0%,_#fafafc_55%)]">
      <div className="mx-auto flex min-h-dvh max-w-5xl flex-col px-4 py-6 sm:px-6">{children}</div>
    </div>
  );
}
