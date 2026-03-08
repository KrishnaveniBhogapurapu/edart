import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  WorkspaceConfig,
  WorkspaceConfigDocument,
} from '../../database/schemas/workspace-config.schema.js';
import { UpdateWorkspaceConfigDto } from './dto/update-workspace-config.dto.js';

@Injectable()
export class WorkspaceConfigService {
  constructor(
    @InjectModel(WorkspaceConfig.name)
    private readonly workspaceConfigModel: Model<WorkspaceConfigDocument>,
  ) {}

  private normalizeWorkspaceDoc(doc: Record<string, unknown>): Record<string, unknown> {
    return {
      ...doc,
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
        timezone: 'Asia/Kolkata',
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
    const updated = await this.workspaceConfigModel
      .findOneAndUpdate(
        { userId: new Types.ObjectId(userId) },
        {
          $set: {
            ...(payload.mode ? { mode: payload.mode } : {}),
            ...(payload.interval ? { interval: payload.interval } : {}),
            ...(payload.session ? { session: payload.session } : {}),
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
