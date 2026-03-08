import { Injectable } from '@nestjs/common';

interface SessionState {
  lastEmittedCount: number;
  lastSignature: string;
}

@Injectable()
export class SessionRuntimeService {
  private readonly byUser = new Map<string, SessionState>();

  get(userId: string): SessionState {
    return this.byUser.get(userId) ?? { lastEmittedCount: 0, lastSignature: '' };
  }

  update(userId: string, state: SessionState): void {
    this.byUser.set(userId, state);
  }

  reset(userId: string): void {
    this.byUser.delete(userId);
  }
}
