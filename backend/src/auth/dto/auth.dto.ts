import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';

export class RegisterDto {
  @IsEmail({}, { message: 'Email inválido' })
  @IsNotEmpty({ message: 'Email é obrigatório' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'Nick é obrigatório' })
  @MinLength(3, { message: 'Nick deve ter no mínimo 3 caracteres' })
  @MaxLength(20, { message: 'Nick deve ter no máximo 20 caracteres' })
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: 'Nick só pode conter letras, números e underscore',
  })
  nick: string;

  @IsString()
  @IsNotEmpty({ message: 'Password é obrigatória' })
  @MinLength(6, { message: 'Password deve ter no mínimo 6 caracteres' })
  password: string;
}

export class LoginDto {
  @IsEmail({}, { message: 'Email inválido' })
  @IsNotEmpty({ message: 'Email é obrigatório' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'Password é obrigatória' })
  password: string;
}

export class RefreshTokenDto {
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}
