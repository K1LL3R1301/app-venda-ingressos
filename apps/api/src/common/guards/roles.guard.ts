import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('UsuÃ¡rio nÃ£o autenticado');
    }

    const userRole = String(user.role || '').toUpperCase();

    if (userRole === 'SUPER_ADMIN') {
      return true;
    }

    const normalizedRequiredRoles = requiredRoles.map((role) =>
      String(role || '').toUpperCase(),
    );

    if (!normalizedRequiredRoles.includes(userRole)) {
      throw new ForbiddenException('VocÃª nÃ£o tem permissÃ£o para acessar esta rota');
    }

    return true;
  }
}
