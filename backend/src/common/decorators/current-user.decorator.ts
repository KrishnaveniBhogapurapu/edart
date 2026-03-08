import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface CurrentUserPayload {
  sub: string;
  email: string;
}

export const CurrentUser = createParamDecorator((_: unknown, context: ExecutionContext): CurrentUserPayload => {
  const request = context.switchToHttp().getRequest();
  return request.user as CurrentUserPayload;
});
