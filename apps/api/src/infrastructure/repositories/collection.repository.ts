import { SYSTEM_ACTOR } from "@moonwitness/orm";
import type { ActorContext } from "@moonwitness/orm";
import { collectionModel } from "../persistence/collection-model";
import type { CollectionRecord } from "../persistence/collection-model";

export class SqlCollectionRepository {
  private get repo() {
    return collectionModel.repository;
  }

  async listCollections(): Promise<CollectionRecord[]> {
    return this.repo.list({ limit: 100 });
  }

  async getCollection(id: string): Promise<CollectionRecord | null> {
    return this.repo.findOne(id);
  }

  async createCollection(
    data: {
      name: string;
      episodes?: number;
      cover?: CollectionRecord["cover"];
      description?: string;
    },
    actor: ActorContext = SYSTEM_ACTOR,
  ): Promise<CollectionRecord> {
    return this.repo.create(data, actor);
  }
}

