import { readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { Verifier } from "@pact-foundation/pact";

const pactDir = resolve(process.cwd(), "../web/pacts");
const pactFiles = (await readdir(pactDir))
  .filter((file) => file.endsWith(".json"))
  .map((file) => resolve(pactDir, file));

if (pactFiles.length === 0) {
  throw new Error(`No Pact files found in ${pactDir}`);
}

const verifier = new Verifier({
  provider: "MoonWitness API",
  providerBaseUrl: process.env.PACT_PROVIDER_URL ?? "http://127.0.0.1:3002",
  pactUrls: pactFiles,
});

await verifier.verifyProvider();
