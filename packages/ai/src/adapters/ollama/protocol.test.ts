import { describe, expect, it } from "vitest";

const baseUrl = process.env.OPENAI_COMPATIBLE_BASE_URL?.replace(/\/+$/, "");
const model = process.env.OPENAI_COMPATIBLE_MODEL;
const apiKey = process.env.OPENAI_COMPATIBLE_API_KEY;
const integration = baseUrl && model ? describe : describe.skip;

function headers(): HeadersInit {
  return {
    "Content-Type": "application/json",
    ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

integration("OpenAI-compatible protocol validation (opt-in)", () => {
  it("lists models using the OpenAI-compatible response shape", async () => {
    const response = await fetch(`${baseUrl}/models`, { headers: headers() });
    expect(response.ok).toBe(true);

    const payload: unknown = await response.json();
    expect(isRecord(payload) && Array.isArray(payload.data)).toBe(true);
    expect(
      isRecord(payload) &&
        Array.isArray(payload.data) &&
        payload.data.some((item) => isRecord(item) && typeof item.id === "string"),
    ).toBe(true);
  });

  it("returns an assistant message for a non-streaming completion", async () => {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: "Reply with OK only." }],
        stream: false,
        temperature: 0,
      }),
    });
    expect(response.ok).toBe(true);

    const payload: unknown = await response.json();
    expect(isRecord(payload) && Array.isArray(payload.choices)).toBe(true);
    const firstChoice =
      isRecord(payload) && Array.isArray(payload.choices) ? payload.choices[0] : undefined;
    expect(isRecord(firstChoice) && isRecord(firstChoice.message)).toBe(true);
    expect(
      isRecord(firstChoice) &&
        isRecord(firstChoice.message) &&
        firstChoice.message.role,
    ).toBe("assistant");
    expect(
      isRecord(firstChoice) &&
        isRecord(firstChoice.message) &&
        typeof firstChoice.message.content === "string",
    ).toBe(true);
    expect(isRecord(firstChoice) && typeof firstChoice.finish_reason === "string").toBe(true);

    if (isRecord(payload) && payload.usage !== undefined) {
      expect(isRecord(payload.usage)).toBe(true);
    }
  });

  it("streams SSE completion chunks and the terminal marker", async () => {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: "Reply with OK only." }],
        stream: true,
        temperature: 0,
      }),
    });
    expect(response.ok).toBe(true);
    expect(response.headers.get("content-type")).toContain("text/event-stream");
    expect(response.body).not.toBeNull();

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let sawData = false;
    let sawDone = false;

    while (!sawDone) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, "\n");
      const events = buffer.split("\n\n");
      buffer = events.pop() ?? "";

      for (const event of events) {
        const data = event
          .split("\n")
          .filter((line) => line.startsWith("data:"))
          .map((line) => line.slice(5).trim())
          .join("\n");
        if (!data) continue;
        if (data === "[DONE]") {
          sawDone = true;
          break;
        }

        const payload: unknown = JSON.parse(data);
        expect(isRecord(payload) && Array.isArray(payload.choices)).toBe(true);
        sawData = true;
      }
    }

    await reader.cancel();
    expect(sawData).toBe(true);
    expect(sawDone).toBe(true);
  });

  it("returns an HTTP client error for an unavailable model", async () => {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({
        model: "moonwitness-model-that-does-not-exist",
        messages: [{ role: "user", content: "Reply with OK only." }],
        stream: false,
      }),
    });

    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(response.status).toBeLessThan(500);
  });
});
