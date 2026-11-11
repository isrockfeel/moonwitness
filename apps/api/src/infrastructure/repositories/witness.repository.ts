import { SYSTEM_ACTOR } from "@moonwitness/orm";
import type { ActorContext } from "@moonwitness/orm";
import { witnessModel } from "../persistence/witness-model";
import type { WitnessRecord } from "../persistence/witness-model";

export class SqlWitnessRepository {
  private get repo() {
    return witnessModel.repository;
  }

  async listWitnesses(): Promise<WitnessRecord[]> {
    return this.repo.list({ limit: 200 });
  }

  async getWitness(id: string): Promise<WitnessRecord | null> {
    return this.repo.findOne(id);
  }

  async createWitness(
    data: {
      name: string;
      place: string;
      x: number;
      y: number;
      quote?: string;
      signals?: number;
    },
    actor: ActorContext = SYSTEM_ACTOR,
  ): Promise<WitnessRecord> {
    return this.repo.create(data, actor);
  }
}

