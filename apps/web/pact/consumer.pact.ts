import assert from "node:assert/strict";
import { mkdir, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { Matchers, PactV4, SpecificationVersion } from "@pact-foundation/pact";
import { fetchTimelineEvents } from "../src/lib/api/timeline";

const pactDir = resolve(process.cwd(), "pacts");
await rm(pactDir, { recursive: true, force: true });
await mkdir(pactDir, { recursive: true });

const provider = new PactV4({
  consumer: "MoonWitness Web",
  provider: "MoonWitness API",
  dir: pactDir,
  spec: SpecificationVersion.SPECIFICATION_VERSION_V4,
});

await provider
  .addInteraction()
  .uponReceiving("a request for timeline events")
  .withRequest("GET", "/api/v1/timeline/events", (builder) => {
    builder.query({ limit: "5" });
  })
  .willRespondWith(200, (builder) => {
    builder.jsonBody({
      data: Matchers.eachLike({
        id: Matchers.string("evt-001"),
        title: Matchers.string("Origins"),
      }),
      total: Matchers.integer(5),
    });
  })
  .executeTest(async (mockServer) => {
    const response = await fetchTimelineEvents({ limit: 5 }, `${mockServer.url}/api/v1`);
    assert.equal(response.total, 5);
    assert.ok(response.data.length > 0);
  });
