import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { UpdateWorkspaceConfigDto } from './dto/update-workspace-config.dto.js';
import { WorkspaceConfigService } from './workspace-config.service.js';

@UseGuards(JwtAuthGuard)
@Controller('config/workspace')
export class WorkspaceConfigController {
  constructor(private readonly workspaceConfigService: WorkspaceConfigService) {}

  @Get()
  getWorkspace(@CurrentUser() user: { sub: string }) {
    return this.workspaceConfigService.getWorkspace(user.sub);
  }

  @Put()
  upsertWorkspace(
    @CurrentUser() user: { sub: string },
    @Body() body: UpdateWorkspaceConfigDto,
  ) {
    return this.workspaceConfigService.upsertWorkspace(user.sub, body);
  }
}
