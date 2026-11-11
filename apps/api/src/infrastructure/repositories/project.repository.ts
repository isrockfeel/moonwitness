import { SYSTEM_ACTOR } from "@moonwitness/orm";
import type { ActorContext } from "@moonwitness/orm";
import { projectModel } from "../persistence/project-model";
import type { ProjectRecord } from "../persistence/project-model";

export class SqlProjectRepository {
  private get repo() {
    return projectModel.repository;
  }

  async listProjects(stage?: ProjectRecord["stage"]): Promise<ProjectRecord[]> {
    if (stage) {
      return this.repo.find({ stage });
    }
    return this.repo.list({ limit: 500 });
  }

  async getProject(id: string): Promise<ProjectRecord | null> {
    return this.repo.findOne(id);
  }

  async createProject(
    data: Omit<ProjectRecord, "id" | "create_date" | "write_date" | "status" | "version" | "source" | "create_uid" | "write_uid" | "deleted_uid" | "deleted_date" | "source_ref"> & { id?: string },
    actor: ActorContext = SYSTEM_ACTOR,
  ): Promise<ProjectRecord> {
    return this.repo.create(data, actor);
  }

  async updateProject(
    id: string,
    data: Partial<ProjectRecord>,
    actor: ActorContext = SYSTEM_ACTOR,
  ): Promise<ProjectRecord | null> {
    return this.repo.update(id, data, actor);
  }

  async deleteProject(id: string, actor: ActorContext = SYSTEM_ACTOR): Promise<boolean> {
    const deleted = await this.repo.delete(id, actor);
    return deleted !== null;
  }
}

