"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from "firebase/auth";
import { Alert, Brand, Button, Card, Field, Input, PageShell } from "@/components/ui";
import { auth, firebaseConfigured } from "@/lib/client/firebase";
import { destinationAfterLogin } from "@/lib/client/after-login";

const FRIENDLY: Record<string, string> = {
  "auth/invalid-credential": "Wrong email or password.",
  "auth/wrong-password": "Wrong email or password.",
  "auth/user-not-found": "No account with that email. Create one instead?",
  "auth/email-already-in-use": "An account with this email already exists. Sign in instead.",
  "auth/weak-password": "Use a password with at least 8 characters.",
  "auth/invalid-email": "That email address doesn't look right.",
  "auth/user-disabled": "This account has been blocked. Contact support if you think this is a mistake.",
  "auth/popup-closed-by-user": "The Google window was closed before signing in.",
  "auth/too-many-requests": "Too many attempts. Wait a minute and try again.",
  "auth/operation-not-allowed": "This sign-in method isn't turned on yet. (Admin: enable it in Firebase → Authentication → Sign-in method.)",
  "auth/unauthorized-domain": "This website isn't allowed to sign in yet. (Admin: add it in Firebase → Authentication → Settings → Authorized domains.)",
};

function message(err: unknown) {
  const code = (err as { code?: string })?.code || "";
  return FRIENDLY[code] || (err as Error)?.message || "Something went wrong. Please try again.";
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next");
  const [mode, setMode] = useState<"signin" | "signup">(params.get("mode") === "signup" ? "signup" : "signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<"" | "google" | "email" | "reset">("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function finish() {
    try {
      router.replace(await destinationAfterLogin(next));
    } catch (err) {
      await signOut(auth());
      throw err;
    }
  }

  async function google() {
    setError("");
    setBusy("google");
    try {
      await signInWithPopup(auth(), new GoogleAuthProvider());
      await finish();
    } catch (err) {
      setError(message(err));
      setBusy("");
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (mode === "signup" && password.length < 8) return setError("Use a password with at least 8 characters.");
    setBusy("email");
    try {
      if (mode === "signup") {
        const cred = await createUserWithEmailAndPassword(auth(), email.trim(), password);
        if (name.trim()) {
          await updateProfile(cred.user, { displayName: name.trim() });
          await cred.user.getIdToken(true); // so the server sees the new name
        }
      } else {
        await signInWithEmailAndPassword(auth(), email.trim(), password);
      }
      await finish();
    } catch (err) {
      setError(message(err));
      setBusy("");
    }
  }

  async function reset() {
    setError("");
    if (!email.trim()) return setError("Enter your email first, then click 'Forgot password?'.");
    setBusy("reset");
    try {
      await sendPasswordResetEmail(auth(), email.trim());
      setNotice("Check your inbox for a link to reset your password.");
    } catch (err) {
      setError(message(err));
    }
    setBusy("");
  }

  const signup = mode === "signup";

  return (
    <PageShell>
      <header>
        <Brand />
      </header>
      <main className="flex flex-1 items-center justify-center py-10">
        <Card className="w-full max-w-md">
          <h1 className="text-2xl font-bold tracking-tight">{signup ? "Create your Mira account" : "Welcome back"}</h1>
          <p className="mt-1 text-sm text-zinc-500">{signup ? "Free to start. No card needed." : "Sign in to continue to Mira."}</p>

          {!firebaseConfigured && <div className="mt-4"><Alert>Firebase isn&apos;t configured yet. Add the NEXT_PUBLIC_FIREBASE_* variables.</Alert></div>}

          <Button variant="ghost" className="mt-6 w-full" onClick={google} busy={busy === "google"} disabled={!!busy}>
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
              <path fill="#4285F4" d="M22.5 12.3c0-.8-.1-1.5-.2-2.2H12v4.2h5.9a5 5 0 0 1-2.2 3.3v2.7h3.5c2.1-1.9 3.3-4.7 3.3-8z" />
              <path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.5-2.7c-1 .7-2.3 1.1-3.8 1.1-2.9 0-5.4-2-6.3-4.6H2.1v2.8A11 11 0 0 0 12 23z" />
              <path fill="#FBBC05" d="M5.7 14.1a6.6 6.6 0 0 1 0-4.2V7.1H2.1a11 11 0 0 0 0 9.8l3.6-2.8z" />
              <path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.1-3.1A11 11 0 0 0 2.1 7.1l3.6 2.8C6.6 7.4 9.1 5.4 12 5.4z" />
            </svg>
            Continue with Google
          </Button>

          <div className="my-5 flex items-center gap-3 text-xs text-zinc-400">
            <span className="h-px flex-1 bg-zinc-200" /> or <span className="h-px flex-1 bg-zinc-200" />
          </div>

          <form onSubmit={submit} className="flex flex-col gap-4">
            {signup && (
              <Field label="Your name">
                <Input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
              </Field>
            )}
            <Field label="Email">
              <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
            </Field>
            <Field label="Password">
              <Input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={signup ? "new-password" : "current-password"}
              />
            </Field>
            {!signup && (
              <button type="button" onClick={reset} className="-mt-2 self-end text-xs font-medium text-violet-700 hover:underline" disabled={!!busy}>
                Forgot password?
              </button>
            )}
            {error && <Alert>{error}</Alert>}
            {notice && <Alert tone="success">{notice}</Alert>}
            <Button type="submit" busy={busy === "email"} disabled={!!busy}>
              {signup ? "Create account" : "Sign in"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-zinc-500">
            {signup ? "Already have an account?" : "New to Mira?"}{" "}
            <button
              className="font-semibold text-violet-700 hover:underline"
              onClick={() => {
                setMode(signup ? "signin" : "signup");
                setError("");
              }}
            >
              {signup ? "Sign in" : "Create an account"}
            </button>
          </p>
        </Card>
      </main>
    </PageShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
