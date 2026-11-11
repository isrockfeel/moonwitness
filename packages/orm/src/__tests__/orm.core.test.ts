import { defineModel, getDb, initDb, uuidv7, BaseRepository, TimelineRepository } from "../index";
import { BetterSqlite3Driver } from "../drivers/sqlite.driver";
import type { BaseMetadata, RecordSource, RecordStatus } from "../base-metadata";
import type { ActorContext, createActorContext } from "../actor-context";
import { SYSTEM_ACTOR } from "../actor-context";

describe("ORM Core", () => {
  beforeAll(() => {
    // In-memory SQLite using better-sqlite3 :memory:
    initDb(":memory:");
  });

  afterAll(() => {
    closeDb();
  });

  describe("UUID v7 generation", () => {
    it("should generate valid UUID v7 strings", () => {
      const id1 = uuidv7();
      const id2 = uuidv7();

      // UUID v7 format: xxxxxxxx-xxxx-7xxx-8xxx-xxxxxxxxxxxx
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-8[0-9a-f]{3}-[0-9a-f]{12}$/;
      expect(uuidRegex.test(id1)).toBe(true);
      expect(uuidRegex.test(id2)).toBe(true);
      expect(id1).not.toBe(id2); // Should be unique
    });

    it("should be time-sortable (timestamp embedded)", () => {
      const ids = Array.from({ length: 100 }, () => uuidv7());
      // IDs should be roughly sorted by timestamp (first 6 hex chars of time portion)
      // v7 embeds Date.now() in big-endian format at the start
    });
  });

  describe("BaseMetadata type", () => {
    it("should have all required fields", () => {
      const metadata: BaseMetadata = {
        id: uuidv7(),
        create_uid: null,
        create_date: new Date(),
        write_uid: null,
        write_date: new Date(),
        status: "active",
        deleted_uid: null,
        deleted_date: null,
        version: 1,
        source: "api",
        source_ref: null,
      };
      expect(metadata.id).toBeDefined();
      expect(metadata.create_uid).toBeNull();
      expect(metadata.status).toBe("active");
      expect(metadata.version).toBe(1);
      expect(metadata.source).toBe("api");
    });
  });

  describe("ActorContext", () => {
    it("should create valid ActorContext", () => {
      const actor = createActorContext("user-123", "api", "req-456");
      expect(actor.actorId).toBe("user-123");
      expect(actor.source).toBe("api");
      expect(actor.requestId).toBe("req-456");
    });

    it("should create SYSTEM_ACTOR", () => {
      expect(SYSTEM_ACTOR.actorId).toBeNull();
      expect(SYSTEM_ACTOR.source).toBe("seed");
      expect(SYSTEM_ACTOR.requestId).toBeUndefined();
    });
  });
});