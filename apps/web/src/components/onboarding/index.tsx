"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Grain, Tape, ZineCardRough, ZineInput } from "@moonwitness/ui";
import { ArrowRight, Crown, Star4 } from "@moonwitness/ui/icons";
import { useCreateSuperuser, useSetupStatus } from "@/lib/api/onboarding";

type Step = "instance" | "account" | "review";

const STEPS: { id: Step; label: string }[] = [
  { id: "instance", label: "Instance" },
  { id: "account", label: "Superuser" },
  { id: "review", label: "Selesai" },
];

function StepRail({ current }: { current: Step }) {
  const index = STEPS.findIndex((s) => s.id === current);
  return (
    <ol className="flex items-center gap-2">
      {STEPS.map((step, i) => {
        const state = i < index ? "done" : i === index ? "active" : "todo";
        return (
          <li key={step.id} className="flex items-center gap-2">
            <span
              className={`flex h-6 w-6 items-center justify-center border text-[10px] font-bold ${
                state === "done"
                  ? "border-[var(--green)] bg-[var(--green)]/15 text-[var(--green)]"
                  : state === "active"
                    ? "border-[var(--pink)] bg-[var(--pink)]/15 text-[var(--pink)]"
                    : "border-[var(--line)] text-zinc-600"
              }`}
            >
              {i + 1}
            </span>
            <span
              className={`text-[10px] tracking-[0.2em] ${
                state === "todo" ? "text-zinc-600" : "text-zinc-300"
              }`}
            >
              {step.label.toUpperCase()}
            </span>
            {i < STEPS.length - 1 && <span className="h-px w-6 bg-[var(--line)]" />}
          </li>
        );
      })}
    </ol>
  );
}

function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-bold tracking-wider text-zinc-300">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-1.5 text-xs text-[var(--red)]">
          {error}
        </p>
      ) : (
        hint && <p className="mt-1.5 text-[11px] text-zinc-500">{hint}</p>
      )}
    </div>
  );
}

export function Onboarding() {
  const router = useRouter();
  const status = useSetupStatus();
  const create = useCreateSuperuser();

  const [step, setStep] = useState<Step>("instance");
  const [instanceName, setInstanceName] = useState("Moonwitness");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const passwordHint = useMemo(() => "Minimal 10 karakter.", []);

  if (status.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center font-brush text-2xl text-[var(--pink)]">
        MEMERIKSA INSTANCE…
      </div>
    );
  }

  if (status.isError) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <ZineCardRough className="max-w-lg p-6">
          <h1 className="font-brush text-2xl text-[var(--red)]">CONTROL PLANE TIDAK TERJANGKAU</h1>
          <p className="mt-2 text-sm text-zinc-400">
            {(status.error as Error).message}. Pastikan arsy berjalan dan <code>ARSY_URL</code> di
            apps/api sudah benar.
          </p>
          <p className="mt-3 text-xs text-zinc-500">
            Di VPS: <code>sudo ./install.sh --with-app --with-caddy --domain &lt;host&gt;</code>,
            lalu <code>systemctl status arsy.service</code>.
          </p>
        </ZineCardRough>
      </div>
    );
  }

  if (status.data?.initialized) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <ZineCardRough className="max-w-md p-7 text-center">
          <Crown className="mx-auto h-8 w-12 text-[var(--yellow)]" />
          <h1 className="mt-3 font-brush text-3xl text-white">
            SUDAH <span className="text-[var(--pink)]">TERPASANG</span>
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            Instance <strong className="text-zinc-200">{status.data.instance.name}</strong> sudah
            punya akun. Masuk lewat halaman control.
          </p>
          <Link href="/control" className="btn-zine mt-5 inline-flex px-5 py-3 text-sm">
            MASUK KE CONTROL PLANE <ArrowRight className="h-4 w-4" />
          </Link>
        </ZineCardRough>
      </div>
    );
  }

  function validateAccount(): boolean {
    const next: Record<string, string> = {};
    if (name.trim().length === 0) next.name = "Nama wajib diisi.";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) next.email = "Format email tidak valid.";
    if (password.length < 10) next.password = "Password minimal 10 karakter.";
    if (confirm !== password) next.confirm = "Konfirmasi password tidak sama.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function submit() {
    if (!validateAccount()) {
      setStep("account");
      return;
    }
    create.mutate(
      { name, email, password, instanceName },
      {
        onSuccess: () => {
          setStep("review");
          router.refresh();
        },
        onError: (error: Error) => {
          setErrors({ form: error.message });
        },
      },
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <Grain />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background:
            "radial-gradient(circle at 20% 10%, rgba(255,45,120,0.16), transparent 55%), radial-gradient(circle at 80% 80%, rgba(46,168,255,0.14), transparent 55%)",
        }}
      />
      <Star4 className="absolute right-[12%] top-24 hidden h-10 w-10 text-[var(--pink)] lg:block" />

      <header className="relative z-10 flex h-16 items-center justify-between border-b border-white/10 px-4 sm:px-8">
        <Link href="/" className="flex items-center gap-2">
          <Crown className="h-5 w-8 text-[var(--yellow)]" />
          <span className="font-brush text-xl text-white sm:text-2xl">
            MOON<span className="text-[var(--pink)]">WITNESS</span>
          </span>
        </Link>
        <span className="font-hand text-lg text-zinc-400">First light setup</span>
      </header>

      <main id="main" className="relative z-10 mx-auto max-w-2xl px-4 py-10 sm:px-8">
        <div className="mb-6">
          <p className="text-[10px] tracking-[0.3em] text-zinc-500">CONTROL PLANE / ONBOARDING</p>
          <h1 className="mt-1 font-brush text-4xl text-white sm:text-5xl">
            WELCOME TO <span className="text-[var(--pink)]">THE SHADOW</span>
          </h1>
          <p className="mt-2 max-w-xl text-sm text-zinc-400">
            Instance ini belum punya akun. Buat superuser pertama — hanya bisa dilakukan sekali,
            langsung dari host ini.
          </p>
        </div>

        <div className="mb-5">
          <StepRail current={step} />
        </div>

        <ZineCardRough className="relative p-6 sm:p-8">
          <Tape className="-top-3 left-10 -rotate-3" />

          {step === "instance" && (
            <div className="space-y-5">
              <Field
                id="instance"
                label="NAMA INSTANCE"
                hint="Tampil di header dashboard. Bisa diubah nanti."
              >
                <ZineInput
                  id="instance"
                  value={instanceName}
                  onChange={(e) => setInstanceName(e.target.value)}
                  placeholder="Moonwitness"
                  className="rounded-md px-4 py-3 text-sm"
                />
              </Field>
              <div className="border border-[var(--line)] bg-black/30 p-3 text-[11px] text-zinc-500">
                Versi arsy <span className="text-zinc-300">{status.data?.version ?? "—"}</span> ·
                Instance ID{" "}
                <span className="font-mono text-zinc-400">{status.data?.instance.id}</span>
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setStep("account")}
                  className="btn-zine px-5 py-3 text-sm"
                >
                  LANJUT <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {step === "account" && (
            <form
              className="space-y-5"
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                setStep("review");
              }}
            >
              <Field id="name" label="NAMA" error={errors.name}>
                <ZineInput
                  id="name"
                  value={name}
                  autoComplete="name"
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Rezza"
                  aria-invalid={!!errors.name}
                  className="rounded-md px-4 py-3 text-sm"
                />
              </Field>
              <Field id="email" label="EMAIL" error={errors.email}>
                <ZineInput
                  id="email"
                  type="email"
                  value={email}
                  autoComplete="username"
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  aria-invalid={!!errors.email}
                  className="rounded-md px-4 py-3 text-sm"
                />
              </Field>
              <Field id="password" label="PASSWORD" hint={passwordHint} error={errors.password}>
                <ZineInput
                  id="password"
                  type="password"
                  value={password}
                  autoComplete="new-password"
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••"
                  aria-invalid={!!errors.password}
                  className="rounded-md px-4 py-3 text-sm"
                />
              </Field>
              <Field id="confirm" label="ULANGI PASSWORD" error={errors.confirm}>
                <ZineInput
                  id="confirm"
                  type="password"
                  value={confirm}
                  autoComplete="new-password"
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="••••••••••"
                  aria-invalid={!!errors.confirm}
                  className="rounded-md px-4 py-3 text-sm"
                />
              </Field>
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep("instance")}
                  className="btn-zine btn-paper px-4 py-3 text-sm"
                >
                  KEMBALI
                </button>
                <button type="submit" className="btn-zine px-5 py-3 text-sm">
                  REVIEW <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </form>
          )}

          {step === "review" && (
            <div className="space-y-5">
              <h2 className="font-brush text-2xl text-white">
                SIAP <span className="text-[var(--green)]">DIBUKA</span>
              </h2>
              <dl className="divide-y divide-[var(--line)] border border-[var(--line)]">
                <div className="flex items-center justify-between px-4 py-3">
                  <dt className="text-[10px] tracking-[0.2em] text-zinc-500">INSTANCE</dt>
                  <dd className="text-sm text-zinc-200">{instanceName || "Moonwitness"}</dd>
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <dt className="text-[10px] tracking-[0.2em] text-zinc-500">SUPERUSER</dt>
                  <dd className="text-sm text-zinc-200">{name || "—"}</dd>
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <dt className="text-[10px] tracking-[0.2em] text-zinc-500">EMAIL</dt>
                  <dd className="font-mono text-xs text-zinc-300">{email || "—"}</dd>
                </div>
              </dl>
              {errors.form && (
                <p
                  role="alert"
                  className="border border-[var(--red)]/40 bg-[var(--red)]/10 px-3 py-2 text-xs text-[var(--red)]"
                >
                  {errors.form}
                </p>
              )}
              <p className="text-[11px] text-zinc-500">
                Setelah dibuat, endpoint setup ditutup permanen. Simpan kredensial di tempat aman.
              </p>
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep("account")}
                  className="btn-zine btn-paper px-4 py-3 text-sm"
                  disabled={create.isPending}
                >
                  KEMBALI
                </button>
                <button
                  type="button"
                  onClick={submit}
                  disabled={create.isPending}
                  className="btn-zine px-5 py-3 text-sm"
                >
                  {create.isPending ? "MEMBUAT…" : "BUAT SUPERUSER"}
                </button>
              </div>
            </div>
          )}
        </ZineCardRough>

        <p className="mt-5 text-center text-[11px] text-zinc-600">
          Setup hanya tersedia dari host ini (loopback / SSH tunnel).
        </p>
      </main>
    </div>
  );
}
