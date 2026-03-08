import { Controller, Sse, UseGuards } from '@nestjs/common';
import { Observable } from 'rxjs';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { StreamingService } from './streaming.service.js';

@UseGuards(JwtAuthGuard)
@Controller('stream')
export class StreamingController {
  constructor(private readonly streamingService: StreamingService) {}

  @Sse('session')
  stream(@CurrentUser() user: { sub: string }): Observable<any> {
    return this.streamingService.createUserStream(user.sub);
  }
}
