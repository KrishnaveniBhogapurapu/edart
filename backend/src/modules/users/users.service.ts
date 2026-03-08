import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from '../../database/schemas/user.schema.js';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email: email.toLowerCase().trim() }).exec();
  }

  findById(id: string): Promise<UserDocument | null> {
    if (!Types.ObjectId.isValid(id)) {
      return Promise.resolve(null);
    }
    return this.userModel.findById(id).exec();
  }

  createUser(payload: { email: string; passwordHash: string; name: string }): Promise<UserDocument> {
    return this.userModel.create({
      email: payload.email.toLowerCase().trim(),
      passwordHash: payload.passwordHash,
      name: payload.name,
    });
  }
}
