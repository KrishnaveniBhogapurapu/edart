import { IsString, MinLength } from 'class-validator';

export class SaveZerodhaSessionDto {
  @IsString()
  @MinLength(10)
  enctoken!: string;

  @IsString()
  user_id!: string;
}
