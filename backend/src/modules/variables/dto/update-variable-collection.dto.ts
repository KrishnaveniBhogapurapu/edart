import { IsArray, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateVariableCollectionDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @IsArray()
  variables?: unknown[];
}
