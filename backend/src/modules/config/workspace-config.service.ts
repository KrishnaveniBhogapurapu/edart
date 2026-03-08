import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  WorkspaceConfig,
  WorkspaceConfigDocument,
} from '../../database/schemas/workspace-config.schema.js';
import { UpdateWorkspaceConfigDto } from './dto/update-workspace-config.dto.js';

const IST_TIMEZONE = 'Asia/Kolkata';

@Injectable()
export class WorkspaceConfigService {
  constructor(
    @InjectModel(WorkspaceConfig.name)
    private readonly workspaceConfigModel: Model<WorkspaceConfigDocument>,
  ) {}

  private normalizeWorkspaceDoc(doc: Record<string, unknown>): Record<string, unknown> {
    const session = (doc.session ?? {}) as Record<string, unknown>;

    return {
      ...doc,
      session: {
        marketStartTime:
          typeof session.marketStartTime === 'string' ? session.marketStartTime : '09:15',
        timezone: IST_TIMEZONE,
        anchorRealTime:
          typeof session.anchorRealTime === 'string' ? session.anchorRealTime : null,
      },
      activeVariableCollectionId: doc.activeVariableCollectionId
        ? String(doc.activeVariableCollectionId)
        : null,
    };
  }

  async getWorkspace(userId: string): Promise<Record<string, unknown>> {
    const existing = await this.workspaceConfigModel
      .findOne({ userId: new Types.ObjectId(userId) })
      .lean()
      .exec();

    if (existing) {
      return this.normalizeWorkspaceDoc(existing as unknown as Record<string, unknown>);
    }

    return {
      mode: 'MOCK',
      interval: '3m',
      session: {
        marketStartTime: '09:15',
        timezone: IST_TIMEZONE,
        anchorRealTime: null,
      },
      variables: [],
      activeVariableCollectionId: null,
      api: {},
    };
  }

  async upsertWorkspace(
    userId: string,
    payload: UpdateWorkspaceConfigDto,
  ): Promise<Record<string, unknown>> {
    const normalizedSession = payload.session
      ? {
          ...payload.session,
          timezone: IST_TIMEZONE,
        }
      : undefined;

    const updated = await this.workspaceConfigModel
      .findOneAndUpdate(
        { userId: new Types.ObjectId(userId) },
        {
          $set: {
            ...(payload.mode ? { mode: payload.mode } : {}),
            ...(payload.interval ? { interval: payload.interval } : {}),
            ...(normalizedSession ? { session: normalizedSession } : {}),
            ...(payload.api ? { api: payload.api } : {}),
          },
          $setOnInsert: {
            userId: new Types.ObjectId(userId),
          },
        },
        {
          upsert: true,
          new: true,
        },
      )
      .lean()
      .exec();

    return this.normalizeWorkspaceDoc(updated as unknown as Record<string, unknown>);
  }
}
