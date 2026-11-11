import { SYSTEM_ACTOR } from "@moonwitness/orm";
import type { ActorContext } from "@moonwitness/orm";
import { workflowModel, workflowRunModel } from "../persistence/workflow-model";
import type { WorkflowRecord, WorkflowRunRecord } from "../persistence/workflow-model";

export class SqlWorkflowRepository {
  private get workflowRepo() {
    return workflowModel.repository;
  }

  private get runRepo() {
    return workflowRunModel.repository;
  }

  async listWorkflows(): Promise<WorkflowRecord[]> {
    return this.workflowRepo.list({ limit: 100 });
  }

  async getWorkflow(id: string): Promise<WorkflowRecord | null> {
    return this.workflowRepo.findOne(id);
  }

  async createWorkflow(
    data: { name: string; moduleId: string; detail?: string; state?: WorkflowRecord["state"] },
    actor: ActorContext = SYSTEM_ACTOR,
  ): Promise<WorkflowRecord> {
    return this.workflowRepo.create(data, actor);
  }

  async toggleWorkflow(id: string, actor: ActorContext = SYSTEM_ACTOR): Promise<WorkflowRecord | null> {
    const current = await this.getWorkflow(id);
    if (!current) return null;
    const nextState = current.state === "Running" ? "Paused" : "Running";
    return this.workflowRepo.update(id, { state: nextState }, actor);
  }

  async listRuns(workflowId?: string): Promise<WorkflowRunRecord[]> {
    if (workflowId) {
      return this.runRepo.find({ workflowId });
    }
    return this.runRepo.list({ limit: 100 });
  }

  async createRun(
    data: { workflowId: string; state?: WorkflowRunRecord["state"]; logs?: string[]; startedAt?: string },
    actor: ActorContext = SYSTEM_ACTOR,
  ): Promise<WorkflowRunRecord> {
    return this.runRepo.create(data, actor);
  }
}

