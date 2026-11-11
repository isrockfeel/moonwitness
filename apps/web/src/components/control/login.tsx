"use client";

import { useState } from "react";
import { Tape, ZineCardRough, ZineInput } from "@moonwitness/ui";
import { ArrowRight, Crown } from "@moonwitness/ui/icons";
import { useLogin } from "@/lib/api/onboarding";

export function ControlLogin({ instanceName }: { instanceName?: string }) {
  const login = useLogin();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) {
      setError("Email dan password wajib diisi.");
      return;
    }
    login.mutate(
      { email: email.trim(), password },
      {
        onSuccess: () => window.location.reload(),
        onError: (err: Error) => setError(err.message),
      },
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md">
        <ZineCardRough className="relative p-7 sm:p-9">
          <Tape className="-top-3 left-10 -rotate-6" />
          <Tape className="-top-2 right-8 rotate-3" />
          <Crown className="absolute right-6 top-6 h-6 w-9 rotate-12 text-[var(--yellow)]" />

          <p className="text-[10px] tracking-[0.3em] text-zinc-500">
            {(instanceName ?? "CONTROL PLANE").toUpperCase()}
          </p>
          <h1 className="mt-1 font-brush text-4xl leading-tight text-white sm:text-5xl">
            ENTER <span className="text-[var(--pink)]">THE SHADOW</span>
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-zinc-400">
            Masuk dengan akun arsy untuk melihat host, resource, dan audit trail.
          </p>

          <form onSubmit={submit} className="mt-7 space-y-5" noValidate>
            <div>
              <label
                htmlFor="control-email"
                className="mb-1.5 block text-xs font-bold tracking-wider text-zinc-300"
              >
                EMAIL
              </label>
              <ZineInput
                id="control-email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="rounded-md px-4 py-3 text-sm"
              />
            </div>
            <div>
              <label
                htmlFor="control-password"
                className="mb-1.5 block text-xs font-bold tracking-wider text-zinc-300"
              >
                PASSWORD
              </label>
              <ZineInput
                id="control-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••"
                className="rounded-md px-4 py-3 text-sm"
              />
            </div>

            {error && (
              <p
                role="alert"
                className="border border-[var(--red)]/40 bg-[var(--red)]/10 px-3 py-2 text-xs text-[var(--red)]"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={login.isPending}
              className="btn-zine w-full px-6 py-4 text-xl"
            >
              {login.isPending ? (
                "MASUK…"
              ) : (
                <>
                  MASUK <ArrowRight className="h-5 w-5" />
                </>
              )}
            </button>
          </form>
        </ZineCardRough>
      </div>
    </div>
  );
}
