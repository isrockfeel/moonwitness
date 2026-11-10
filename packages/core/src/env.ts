import { z } from "zod";

export function parseEnv<TShape extends z.ZodRawShape>(
  shape: TShape,
  source: Record<string, string | undefined> = process.env,
): z.infer<z.ZodObject<TShape>> {
  const parsed = z.object(shape).safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid environment variables:\n${issues}`);
  }
  return parsed.data;
}
