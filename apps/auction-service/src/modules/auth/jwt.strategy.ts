// auth/jwt.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly usersService: UsersService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'fallback-secret', // или JWKS
    });
  }

  async validate(payload: any) {
    // payload содержит данные из Logto: sub, email, roles и т.д.
    const { sub: logtoId, roles = [] } = payload;
    const user = await this.usersService.findByLogtoId(logtoId);
    if (!user) throw new UnauthorizedException('Пользователь не найден');
    // Добавляем роли в объект пользователя для дальнейшей проверки
    user.roles = roles;
    return user;
  }
}