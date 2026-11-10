"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Crown, EyeIcon, Smiley, Splatter, Star4 } from "@moonwitness/ui/icons";
import { authenticate } from "@/lib/auth";

export default function ShadowPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [errors, setErrors] = useState<{ identifier?: string; password?: string }>({});
  const [status, setStatus] = useState<"idle" | "entering">("idle");
  const [forgotSent, setForgotSent] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const result = authenticate(email, password);
    if (!result.ok) {
      setErrors(
        result.field === "credentials"
          ? { identifier: result.message }
          : { [result.field]: result.message },
      );
      return;
    }
    setErrors({});

    setStatus("entering");
    const { account } = result;
    setTimeout(() => {
      try {
        const store = remember ? localStorage : sessionStorage;
        store.setItem(
          "mw-session",
          JSON.stringify({
            identity: account.displayName,
            username: account.username,
            role: account.role,
            enteredAt: new Date().toISOString(),
          }),
        );
      } catch {
        // storage unavailable — session continues in memory
      }
      router.push("/mission-control");
    }, 900);
  }

  return (
    <div className="grain relative min-h-screen overflow-hidden">
      <Image
        src="/art/city-shadow.png"
        alt=""
        fill
        priority
        className="object-cover object-[65%_center]"
        sizes="100vw"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-[rgba(11,11,16,0.92)] via-[rgba(11,11,16,0.55)] to-[rgba(11,11,16,0.25)]" />
      <Splatter className="absolute -left-8 top-20 h-48 w-48 text-[var(--pink)] opacity-60" />
      <Star4 className="absolute right-[16%] top-40 hidden h-10 w-10 text-[var(--pink)] lg:block" />

      {/* top bar */}
      <header className="relative z-10 flex h-16 items-center justify-between border-b border-white/10 px-4 sm:px-8">
        <Link href="/" className="flex items-center gap-2">
          <Crown className="h-5 w-8 text-[var(--yellow)]" />
          <span className="font-brush text-xl text-white sm:text-2xl">
            MOON<span className="text-[var(--pink)]">WITNESS</span>
          </span>
          <span className="ml-2 hidden font-hand text-lg text-zinc-400 md:inline">
            Empire of the light
          </span>
        </Link>
        <div className="flex items-center gap-4">
          <span className="hidden font-hand text-lg text-zinc-300 sm:inline">
            Same moon. Different people.
          </span>
          <Link href="/dock" className="btn-zine btn-yellow px-4 py-2 text-sm">
            FOLLOW THE SIGNAL <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </header>

      <main className="relative z-10 mx-auto flex min-h-[calc(100vh-8rem)] max-w-7xl items-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <div className="zine-card-rough relative p-7 sm:p-9">
            <span className="tape -top-3 left-10 -rotate-6" />
            <span className="tape -top-2 right-8 rotate-3" />
            <Crown className="absolute right-6 top-6 h-6 w-9 rotate-12 text-[var(--yellow)]" />

            <h1 className="font-brush text-4xl leading-tight text-white sm:text-5xl">
              ENTER <span className="text-[var(--pink)]">THE SHADOW</span>
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-zinc-400">
              Private command center for stories, research, posters, and publishing.
            </p>

            <form onSubmit={submit} className="mt-7 space-y-5" noValidate>
              <div>
                <label
                  htmlFor="email"
                  className="mb-1.5 block text-xs font-bold tracking-wider text-zinc-300"
                >
                  Email or Username
                </label>
                <input
                  id="email"
                  type="text"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email or username"
                  aria-invalid={!!errors.identifier}
                  aria-describedby={errors.identifier ? "email-error" : undefined}
                  className="zine-input rounded-md px-4 py-3 text-sm"
                />
                {errors.identifier && (
                  <p id="email-error" role="alert" className="mt-1.5 text-xs text-[var(--red)]">
                    {errors.identifier}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="mb-1.5 block text-xs font-bold tracking-wider text-zinc-300"
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    aria-invalid={!!errors.password}
                    aria-describedby={errors.password ? "password-error" : undefined}
                    className="zine-input rounded-md px-4 py-3 pr-12 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    aria-pressed={showPassword}
                    className={`absolute right-3 top-1/2 -translate-y-1/2 transition-colors ${showPassword ? "text-[var(--pink)]" : "text-zinc-500 hover:text-zinc-300"}`}
                  >
                    <EyeIcon className="h-5 w-5" />
                  </button>
                </div>
                {errors.password && (
                  <p id="password-error" role="alert" className="mt-1.5 text-xs text-[var(--red)]">
                    {errors.password}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between">
                <label className="flex cursor-pointer items-center gap-2 text-xs text-zinc-300">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="h-4 w-4 cursor-pointer accent-[var(--pink)]"
                  />
                  Remember me
                </label>
                <button
                  type="button"
                  onClick={() => setForgotSent(true)}
                  className="text-xs text-[var(--blue)] underline-offset-4 hover:underline"
                >
                  Forgot password?
                </button>
              </div>

              {forgotSent && (
                <p
                  className="border border-[var(--blue)]/40 bg-[var(--blue)]/10 px-3 py-2 text-xs text-[var(--blue)]"
                  role="status"
                >
                  Recovery signal sent. Check your inbox — the shadow answers within one moon cycle.
                </p>
              )}

              <button
                type="submit"
                disabled={status === "entering"}
                className="btn-zine w-full px-6 py-4 text-xl"
              >
                {status === "entering" ? (
                  "ENTERING…"
                ) : (
                  <>
                    ENTER THE SHADOW <ArrowRight className="h-5 w-5" />
                  </>
                )}
              </button>

              <div className="flex items-center gap-3 pt-1 text-[11px] text-zinc-500">
                <span className="h-px flex-1 bg-[var(--line)]" />
                <Crown className="h-3 w-5 text-[var(--yellow)]" />
                Authorized crew only.
                <span className="h-px flex-1 bg-[var(--line)]" />
              </div>
              <p className="text-center text-[11px] text-zinc-600">
                Hardcoded demo crew — admin / admin123
              </p>
            </form>
          </div>

          <div className="sticker mt-6 inline-block -rotate-2 px-4 py-2 font-hand text-lg font-bold">
            WITNESS THE REAL.
          </div>
        </div>

        <div className="ml-auto hidden flex-col items-end gap-6 lg:flex">
          <div
            className="sticker float-y max-w-[220px] rotate-2 px-4 py-3 font-hand text-xl font-bold"
            style={{ "--rot": "2deg" } as React.CSSProperties}
          >
            DIFFERENT PEOPLE.
            <br />
            SAME SKY.
            <br />
            STORIES BEYOND BORDERS.
          </div>
          <div
            className="sticker sticker-black float-y max-w-[220px] -rotate-2 border border-[var(--line)] px-4 py-3 font-hand text-xl"
            style={{ "--rot": "-2deg", animationDelay: "1s" } as React.CSSProperties}
          >
            A BRIGHTER TOMORROW FOR A BOLDER HUMANITY.
          </div>
          <Smiley className="h-12 w-12 rotate-12 text-[var(--yellow)]" />
        </div>
      </main>

      <footer className="relative z-10 flex items-center justify-between border-t border-white/10 px-4 py-4 text-[11px] text-zinc-500 sm:px-8">
        <span className="flex items-center gap-2">
          <Smiley className="h-4 w-4 text-[var(--yellow)]" />
          Moonwitness // Create · Curate · Publish
        </span>
        <nav className="flex gap-4">
          <Link href="/" className="hover:text-[var(--pink)]">
            Home
          </Link>
          <Link href="/dock" className="hover:text-[var(--pink)]">
            Archive
          </Link>
          <Link href="/mission-control" className="hover:text-[var(--pink)]">
            Mission Control
          </Link>
        </nav>
      </footer>
    </div>
  );
}
