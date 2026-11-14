import type { HTMLAttributes } from "react";
import { cn } from "../cn";
import { ZineButton } from "../primitives/zine-button";
import { ZineCard } from "../primitives/zine-card";
import { StatusBadge } from "./status-badge";

export type ServiceAvailability = "available" | "degraded" | "unavailable";

const SERVICE_STATUS_TONE: Record<ServiceAvailability, string> = {
  available: "var(--green)",
  degraded: "var(--yellow)",
  unavailable: "var(--red)",
};

export interface ServiceStatusProps {
  status: ServiceAvailability;
}

export function ServiceStatus({ status }: ServiceStatusProps) {
  return <StatusBadge status={status.toUpperCase()} tone={SERVICE_STATUS_TONE[status]} dark />;
}

export type OperationsStateKind = "loading" | "empty" | "error" | "unavailable";

const OPERATIONS_STATE_TONE: Record<OperationsStateKind, string> = {
  loading: "var(--blue)",
  empty: "var(--paper)",
  error: "var(--red)",
  unavailable: "var(--red)",
};

export interface OperationsStateProps extends HTMLAttributes<HTMLDivElement> {
  state: OperationsStateKind;
  heading: string;
  description?: string;
  onRetry?: () => void;
  retryLabel?: string;
  retrying?: boolean;
}

export function OperationsState({
  state,
  heading,
  description,
  onRetry,
  retryLabel = "Try again",
  retrying = false,
  className,
  ...props
}: OperationsStateProps) {
  const isError = state === "error" || state === "unavailable";

  return (
    <ZineCard
      {...props}
      role={isError ? "alert" : "status"}
      aria-busy={state === "loading" || retrying || undefined}
      className={cn(
        "flex flex-col gap-4 border-[var(--line)] bg-[var(--panel)] p-4 text-[var(--paper)] sm:flex-row sm:items-start sm:p-5",
        className,
      )}
    >
      <StatusBadge status={state.toUpperCase()} tone={OPERATIONS_STATE_TONE[state]} dark />
      <div className="min-w-0 flex-1">
        <h2 className="font-semibold text-white">{heading}</h2>
        {description ? <p className="mt-1 text-sm text-zinc-300">{description}</p> : null}
      </div>
      {isError && onRetry ? (
        <ZineButton tone="blue" onClick={onRetry} disabled={retrying} className="shrink-0">
          {retrying ? "Retrying…" : retryLabel}
        </ZineButton>
      ) : null}
    </ZineCard>
  );
}
