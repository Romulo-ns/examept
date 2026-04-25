import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
} from 'class-validator';

export class SubmitAttemptDto {
  @IsString()
  @IsNotEmpty({ message: 'ID da questão é obrigatório' })
  questionId: string;

  @IsString()
  @IsNotEmpty({ message: 'ID da opção é obrigatório' })
  optionId: string;

  @IsOptional()
  @IsBoolean()
  hintUsed?: boolean;

  @IsOptional()
  @IsNumber()
  timeSpentMs?: number;
}
