import { Type } from 'class-transformer';
import {
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

class SessionConfigDto {
  @IsOptional()
  @IsString()
  marketStartTime?: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsString()
  anchorRealTime?: string;
}

export class UpdateWorkspaceConfigDto {
  @IsOptional()
  @IsIn(['MOCK', 'API', 'EXCEL'])
  mode?: 'MOCK' | 'API' | 'EXCEL';

  @IsOptional()
  @IsIn(['3m', '5m', '15m'])
  interval?: '3m' | '5m' | '15m';

  @IsOptional()
  @ValidateNested()
  @Type(() => SessionConfigDto)
  session?: SessionConfigDto;

  @IsOptional()
  @IsObject()
  api?: Record<string, unknown>;
}
