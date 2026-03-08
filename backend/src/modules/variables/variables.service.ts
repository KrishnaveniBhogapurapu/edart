import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { validateVariableConfigs, VariableConfig } from '@candle/engine';
import { Model, Types } from 'mongoose';
import {
  VariableCollection,
  VariableCollectionDocument,
} from '../../database/schemas/variable-collection.schema.js';
import {
  WorkspaceConfig,
  WorkspaceConfigDocument,
} from '../../database/schemas/workspace-config.schema.js';
import { CreateVariableCollectionDto } from './dto/create-variable-collection.dto.js';
import { UpdateVariableCollectionDto } from './dto/update-variable-collection.dto.js';

@Injectable()
export class VariablesService {
  constructor(
    @InjectModel(VariableCollection.name)
    private readonly variableCollectionModel: Model<VariableCollectionDocument>,
    @InjectModel(WorkspaceConfig.name)
    private readonly workspaceConfigModel: Model<WorkspaceConfigDocument>,
  ) {}

  private readonly workspaceDefaults = {
    mode: 'MOCK',
    interval: '3m',
    session: {
      marketStartTime: '09:15',
      timezone: 'Asia/Kolkata',
      anchorRealTime: null,
    },
    api: {},
  };

  private toObjectId(value: string, fieldName = 'id') {
    if (!Types.ObjectId.isValid(value)) {
      throw new BadRequestException(`${fieldName} is invalid.`);
    }
    return new Types.ObjectId(value);
  }

  private assertValidVariables(variables: unknown[]) {
    const validation = validateVariableConfigs(variables as VariableConfig[]);
    if (!validation.ok) {
      throw new BadRequestException({
        message: 'Variable configuration validation failed.',
        errors: validation.errors,
      });
    }
  }

  private async ensureCollectionContext(userObjectId: Types.ObjectId) {
    const workspace = await this.workspaceConfigModel
      .findOne({ userId: userObjectId })
      .select({ variables: 1, activeVariableCollectionId: 1 })
      .lean()
      .exec();

    let collections = await this.variableCollectionModel
      .find({ userId: userObjectId })
      .sort({ updatedAt: -1 })
      .lean()
      .exec();

    if (!collections.length) {
      const bootstrapVariables = Array.isArray(workspace?.variables) ? workspace.variables : [];
      const created = await this.variableCollectionModel.create({
        userId: userObjectId,
        name: 'Default Collection',
        variables: bootstrapVariables,
      });

      await this.workspaceConfigModel
        .findOneAndUpdate(
          { userId: userObjectId },
          {
            $set: {
              variables: bootstrapVariables,
              activeVariableCollectionId: created._id,
            },
            $setOnInsert: {
              userId: userObjectId,
              ...this.workspaceDefaults,
            },
          },
          { upsert: true },
        )
        .exec();

      collections = await this.variableCollectionModel
        .find({ userId: userObjectId })
        .sort({ updatedAt: -1 })
        .lean()
        .exec();
    }

    let activeCollectionId = workspace?.activeVariableCollectionId
      ? String(workspace.activeVariableCollectionId)
      : null;

    let activeCollection = activeCollectionId
      ? collections.find((item) => String(item._id) === activeCollectionId)
      : undefined;

    if (!activeCollection) {
      activeCollection = collections[0];
      activeCollectionId = String(activeCollection._id);
      await this.workspaceConfigModel
        .findOneAndUpdate(
          { userId: userObjectId },
          {
            $set: {
              variables: activeCollection.variables,
              activeVariableCollectionId: activeCollection._id,
            },
            $setOnInsert: {
              userId: userObjectId,
              ...this.workspaceDefaults,
            },
          },
          { upsert: true },
        )
        .exec();
    }

    return {
      activeCollectionId,
      collections,
    };
  }

  validate(variables: unknown[]) {
    const result = validateVariableConfigs(variables as VariableConfig[]);
    return {
      ok: result.ok,
      errors: result.errors,
    };
  }

  async listCollections(userId: string) {
    const userObjectId = this.toObjectId(userId, 'userId');
    const { activeCollectionId, collections } = await this.ensureCollectionContext(userObjectId);

    return {
      activeCollectionId,
      items: collections.map((item) => ({
        id: String(item._id),
        name: item.name,
        variablesCount: Array.isArray(item.variables) ? item.variables.length : 0,
        updatedAt: (item as { updatedAt?: Date }).updatedAt ?? null,
        isActive: String(item._id) === activeCollectionId,
      })),
    };
  }

  async createCollection(userId: string, payload: CreateVariableCollectionDto) {
    const userObjectId = this.toObjectId(userId, 'userId');
    const variables = payload.variables ?? [];
    this.assertValidVariables(variables);

    const created = await this.variableCollectionModel.create({
      userId: userObjectId,
      name: payload.name.trim(),
      variables,
    });

    await this.workspaceConfigModel
      .findOneAndUpdate(
        { userId: userObjectId },
        {
          $set: {
            variables,
            activeVariableCollectionId: created._id,
          },
          $setOnInsert: {
            userId: userObjectId,
            ...this.workspaceDefaults,
          },
        },
        { upsert: true },
      )
      .exec();

    return {
      id: String(created._id),
      name: created.name,
      variablesCount: created.variables.length,
      updatedAt: created.updatedAt ?? null,
      activeCollectionId: String(created._id),
    };
  }

  async updateCollection(userId: string, collectionId: string, payload: UpdateVariableCollectionDto) {
    const userObjectId = this.toObjectId(userId, 'userId');
    const collectionObjectId = this.toObjectId(collectionId);

    if (payload.variables) {
      this.assertValidVariables(payload.variables);
    }

    const updated = await this.variableCollectionModel
      .findOneAndUpdate(
        { _id: collectionObjectId, userId: userObjectId },
        {
          $set: {
            ...(payload.name ? { name: payload.name.trim() } : {}),
            ...(payload.variables ? { variables: payload.variables } : {}),
          },
        },
        { new: true },
      )
      .lean()
      .exec();

    if (!updated) {
      throw new NotFoundException('Variable collection not found.');
    }

    if (payload.variables) {
      const workspace = await this.workspaceConfigModel
        .findOne({ userId: userObjectId })
        .select({ activeVariableCollectionId: 1 })
        .lean()
        .exec();
      if (workspace?.activeVariableCollectionId && String(workspace.activeVariableCollectionId) === collectionId) {
        await this.workspaceConfigModel
          .updateOne(
            { userId: userObjectId },
            { $set: { variables: payload.variables } },
          )
          .exec();
      }
    }

    return {
      id: String(updated._id),
      name: updated.name,
      variablesCount: Array.isArray(updated.variables) ? updated.variables.length : 0,
      updatedAt: (updated as { updatedAt?: Date }).updatedAt ?? null,
    };
  }

  async deleteCollection(userId: string, collectionId: string) {
    const userObjectId = this.toObjectId(userId, 'userId');
    const collectionObjectId = this.toObjectId(collectionId);

    const deleted = await this.variableCollectionModel
      .findOneAndDelete({ _id: collectionObjectId, userId: userObjectId })
      .lean()
      .exec();

    if (!deleted) {
      throw new NotFoundException('Variable collection not found.');
    }

    const remaining = await this.variableCollectionModel
      .find({ userId: userObjectId })
      .sort({ updatedAt: -1 })
      .lean()
      .exec();

    if (remaining.length) {
      const nextActive = remaining[0];
      await this.workspaceConfigModel
        .findOneAndUpdate(
          { userId: userObjectId },
          {
            $set: {
              activeVariableCollectionId: nextActive._id,
              variables: nextActive.variables,
            },
            $setOnInsert: {
              userId: userObjectId,
              ...this.workspaceDefaults,
            },
          },
          { upsert: true },
        )
        .exec();

      return { ok: true, activeCollectionId: String(nextActive._id) };
    }

    const created = await this.variableCollectionModel.create({
      userId: userObjectId,
      name: 'Default Collection',
      variables: [],
    });

    await this.workspaceConfigModel
      .findOneAndUpdate(
        { userId: userObjectId },
        {
          $set: {
            activeVariableCollectionId: created._id,
            variables: [],
          },
          $setOnInsert: {
            userId: userObjectId,
            ...this.workspaceDefaults,
          },
        },
        { upsert: true },
      )
      .exec();

    return { ok: true, activeCollectionId: String(created._id) };
  }

  async activateCollection(userId: string, collectionId: string) {
    const userObjectId = this.toObjectId(userId, 'userId');
    const collectionObjectId = this.toObjectId(collectionId);

    const collection = await this.variableCollectionModel
      .findOne({ _id: collectionObjectId, userId: userObjectId })
      .lean()
      .exec();

    if (!collection) {
      throw new NotFoundException('Variable collection not found.');
    }

    await this.workspaceConfigModel
      .findOneAndUpdate(
        { userId: userObjectId },
        {
          $set: {
            variables: collection.variables,
            activeVariableCollectionId: collectionObjectId,
          },
          $setOnInsert: {
            userId: userObjectId,
            ...this.workspaceDefaults,
          },
        },
        { upsert: true },
      )
      .exec();

    return {
      ok: true,
      activeCollectionId: String(collection._id),
      variables: collection.variables,
    };
  }
}
