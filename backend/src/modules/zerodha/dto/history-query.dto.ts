import { IsIn, IsOptional, IsString } from 'class-validator';

export class HistoryQueryDto {
  @IsString()
  instrumentToken!: string;

  @IsIn(['3m', '5m', '15m'])
  interval!: '3m' | '5m' | '15m';

  @IsString()
  from!: string;

  @IsString()
  to!: string;

  @IsOptional()
  @IsString()
  user_id?: string;
}
