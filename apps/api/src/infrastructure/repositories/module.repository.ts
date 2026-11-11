import { SYSTEM_ACTOR } from "@moonwitness/orm";
import type { ActorContext } from "@moonwitness/orm";
import { moduleModel } from "../persistence/module-model";
import type { ModuleRecord } from "../persistence/module-model";

export class SqlModuleRepository {
  private get repo() {
    return moduleModel.repository;
  }

  async listModules(): Promise<ModuleRecord[]> {
    return this.repo.list({ limit: 100 });
  }

  async getModule(id: string): Promise<ModuleRecord | null> {
    return this.repo.findOne(id);
  }

  async createModule(
    data: {
      name: string;
      description?: string;
      color?: string;
      icon?: string;
      stats?: ModuleRecord["stats"];
      orderIndex?: number;
    },
    actor: ActorContext = SYSTEM_ACTOR,
  ): Promise<ModuleRecord> {
    return this.repo.create(data, actor);
  }
}

