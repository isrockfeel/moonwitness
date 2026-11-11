import { SYSTEM_ACTOR } from "@moonwitness/orm";
import type { ActorContext } from "@moonwitness/orm";
import { userModel, sessionModel } from "../persistence/user-model";
import type { UserRecord, SessionRecord } from "../persistence/user-model";

export class SqlUserRepository {
  private get userRepo() {
    return userModel.repository;
  }

  private get sessionRepo() {
    return sessionModel.repository;
  }

  async findById(id: string): Promise<UserRecord | null> {
    return this.userRepo.findOne(id);
  }

  async findByEmail(email: string): Promise<UserRecord | null> {
    const users = await this.userRepo.find({ email });
    return users[0] ?? null;
  }

  async findByUsername(username: string): Promise<UserRecord | null> {
    const users = await this.userRepo.find({ username });
    return users[0] ?? null;
  }

  async createUser(
    data: {
      username: string;
      email: string;
      passwordHash: string;
      role?: "user" | "admin" | "editor" | "viewer";
      avatarSeed?: string;
      avatarOptions?: UserRecord["avatarOptions"];
    },
    actor: ActorContext = SYSTEM_ACTOR,
  ): Promise<UserRecord> {
    return this.userRepo.create(data, actor);
  }

  async createSession(
    data: {
      userId: string;
      token: string;
      expiresAt: string;
      ipAddress?: string;
      userAgent?: string;
    },
    actor: ActorContext = SYSTEM_ACTOR,
  ): Promise<SessionRecord> {
    return this.sessionRepo.create(data, actor);
  }

  async findSessionByToken(token: string): Promise<SessionRecord | null> {
    const sessions = await this.sessionRepo.find({ token });
    return sessions[0] ?? null;
  }

  async deleteSessionByToken(token: string, actor: ActorContext = SYSTEM_ACTOR): Promise<boolean> {
    const session = await this.findSessionByToken(token);
    if (!session) return false;
    const deleted = await this.sessionRepo.delete(session.id, actor);
    return deleted !== null;
  }
}

