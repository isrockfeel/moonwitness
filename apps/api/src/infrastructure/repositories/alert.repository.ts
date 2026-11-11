import { SYSTEM_ACTOR } from "@moonwitness/orm";
import type { ActorContext } from "@moonwitness/orm";
import { alertModel } from "../persistence/alert-model";
import type { AlertRecord } from "../persistence/alert-model";

export class SqlAlertRepository {
  private get repo() {
    return alertModel.repository;
  }

  async listAlerts(activeOnly = true): Promise<AlertRecord[]> {
    if (activeOnly) {
      return this.repo.find({ dismissed: false });
    }
    return this.repo.list({ limit: 100 });
  }

  async createAlert(
    data: {
      text: string;
      title?: string;
      level?: AlertRecord["level"];
      ago?: string;
      dismissed?: boolean;
    },
    actor: ActorContext = SYSTEM_ACTOR,
  ): Promise<AlertRecord> {
    return this.repo.create(data, actor);
  }

  async dismissAlert(id: string, actor: ActorContext = SYSTEM_ACTOR): Promise<AlertRecord | null> {
    return this.repo.update(id, { dismissed: true }, actor);
  }
}

