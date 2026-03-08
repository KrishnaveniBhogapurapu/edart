import { IsOptional, IsString } from 'class-validator';

export class InstrumentsQueryDto {
  @IsOptional()
  @IsString()
  q?: string;
}
