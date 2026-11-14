import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { OperationsState, ServiceStatus } from "./operations-state";

describe("OperationsState", () => {
  it.each([
    { state: "loading", role: "status", label: "LOADING" },
    { state: "empty", role: "status", label: "EMPTY" },
    { state: "error", role: "alert", label: "ERROR" },
    { state: "unavailable", role: "alert", label: "UNAVAILABLE" },
  ] as const)("announces the $state state and its heading", ({ state, role, label }) => {
    const markup = renderToStaticMarkup(
      <OperationsState state={state} heading="VPN connections" description="Service state" />,
    );

    expect(markup).toContain(`role="${role}"`);
    expect(markup).toContain(label);
    expect(markup).toContain("<h2");
    expect(markup).toContain("VPN connections");
    if (state === "loading") {
      expect(markup).toContain('aria-busy="true"');
    } else {
      expect(markup).not.toContain('aria-busy="true"');
    }
  });

  it("offers a retry action only for errors and exposes its retrying state", () => {
    const retryable = renderToStaticMarkup(
      <OperationsState state="error" heading="VPN connections" onRetry={() => {}} />,
    );
    expect(retryable).toContain('type="button"');
    expect(retryable).toContain(">Try again</button>");

    const retrying = renderToStaticMarkup(
      <OperationsState state="error" heading="VPN connections" onRetry={() => {}} retrying />,
    );

    expect(retrying).toContain("Retrying…");
    expect(retrying).toContain("disabled");
    expect(retrying).toContain('aria-busy="true"');

    const emptyState = renderToStaticMarkup(
      <OperationsState state="empty" heading="VPN connections" onRetry={() => {}} />,
    );
    expect(emptyState).not.toContain("Try again");
  });
});

describe("ServiceStatus", () => {
  it.each([
    { status: "available", tone: "var(--green)" },
    { status: "degraded", tone: "var(--yellow)" },
    { status: "unavailable", tone: "var(--red)" },
  ] as const)("renders text and a shared-token color for $status", ({ status, tone }) => {
    const markup = renderToStaticMarkup(<ServiceStatus status={status} />);

    expect(markup).toContain(status.toUpperCase());
    expect(markup).toContain(tone);
  });
});
