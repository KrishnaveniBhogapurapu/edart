import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { CreateVariableCollectionDto } from './dto/create-variable-collection.dto.js';
import { UpdateVariableCollectionDto } from './dto/update-variable-collection.dto.js';
import { VariablesService } from './variables.service.js';

@UseGuards(JwtAuthGuard)
@Controller('variables')
export class VariablesController {
  constructor(private readonly variablesService: VariablesService) {}

  @Post('validate')
  validate(@Body() body: { variables: unknown[] }) {
    return this.variablesService.validate(body.variables ?? []);
  }

  @Get('collections')
  listCollections(@CurrentUser() user: { sub: string }) {
    return this.variablesService.listCollections(user.sub);
  }

  @Post('collections')
  createCollection(
    @CurrentUser() user: { sub: string },
    @Body() body: CreateVariableCollectionDto,
  ) {
    return this.variablesService.createCollection(user.sub, body);
  }

  @Patch('collections/:id')
  updateCollection(
    @CurrentUser() user: { sub: string },
    @Param('id') id: string,
    @Body() body: UpdateVariableCollectionDto,
  ) {
    return this.variablesService.updateCollection(user.sub, id, body);
  }

  @Delete('collections/:id')
  deleteCollection(@CurrentUser() user: { sub: string }, @Param('id') id: string) {
    return this.variablesService.deleteCollection(user.sub, id);
  }

  @Post('collections/:id/activate')
  activateCollection(@CurrentUser() user: { sub: string }, @Param('id') id: string) {
    return this.variablesService.activateCollection(user.sub, id);
  }
}
