import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from './modules/auth/auth.module.js';
import { UsersModule } from './modules/users/users.module.js';
import { ZerodhaModule } from './modules/zerodha/zerodha.module.js';
import { CandlesModule } from './modules/candles/candles.module.js';
import { VariablesModule } from './modules/variables/variables.module.js';
import { WorkspaceConfigModule } from './modules/config/workspace-config.module.js';
import { StreamingModule } from './modules/streaming/streaming.module.js';
import { UploadsModule } from './modules/uploads/uploads.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const mongoUri = configService.get<string>('MONGODB_URI');
        if (!mongoUri) {
          throw new Error(
            'MONGODB_URI is required. Create backend/.env from backend/.env.example and set your Atlas URI.',
          );
        }
        return {
          uri: mongoUri,
        };
      },
    }),
    AuthModule,
    UsersModule,
    ZerodhaModule,
    CandlesModule,
    VariablesModule,
    WorkspaceConfigModule,
    StreamingModule,
    UploadsModule,
  ],
})
export class AppModule {}
