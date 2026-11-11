import { SYSTEM_ACTOR } from "@moonwitness/orm";
import type { ActorContext } from "@moonwitness/orm";
import { feedItemModel } from "../persistence/feed-model";
import type { FeedItemRecord } from "../persistence/feed-model";

export class SqlFeedRepository {
  private get repo() {
    return feedItemModel.repository;
  }

  async listFeedItems(limit = 50): Promise<FeedItemRecord[]> {
    return this.repo.list({ limit });
  }

  async createFeedItem(
    data: {
      text: string;
      ago?: string;
      color?: string;
      timestamp?: string;
    },
    actor: ActorContext = SYSTEM_ACTOR,
  ): Promise<FeedItemRecord> {
    return this.repo.create(data, actor);
  }
}

