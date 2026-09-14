import { Allow } from 'class-validator';

export class UpdateUserValueDto {
  @Allow()
  value!: unknown;
}
