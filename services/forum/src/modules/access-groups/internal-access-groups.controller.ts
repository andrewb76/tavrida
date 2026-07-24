import { Body, Controller, Delete, Get, Param, Patch, Post, Put } from '@nestjs/common';
import { IsArray, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { AccessGroupsService } from './access-groups.service';

class CreateAccessGroupDto {
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}

class UpdateAccessGroupDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}

class SetMembersDto {
  @IsArray()
  @IsString({ each: true })
  userIds!: string[];
}

class MembershipsByUsersDto {
  @IsArray()
  @IsString({ each: true })
  userIds!: string[];
}

@Controller('internal/v1/access-groups')
export class InternalAccessGroupsController {
  constructor(private readonly accessGroups: AccessGroupsService) {}

  @Get()
  list() {
    return this.accessGroups.list();
  }

  @Post()
  create(@Body() body: CreateAccessGroupDto) {
    return this.accessGroups.create(body);
  }

  /** Must be registered before `:id` routes. */
  @Post('memberships/by-users')
  membershipsByUsers(@Body() body: MembershipsByUsersDto) {
    return this.accessGroups.membershipsForUsers(body.userIds ?? []);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.accessGroups.get(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: UpdateAccessGroupDto) {
    return this.accessGroups.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.accessGroups.remove(id);
  }

  @Get(':id/members')
  getMembers(@Param('id') id: string) {
    return this.accessGroups.getMembers(id);
  }

  @Put(':id/members')
  setMembers(@Param('id') id: string, @Body() body: SetMembersDto) {
    return this.accessGroups.setMembers(id, body.userIds ?? []);
  }
}
