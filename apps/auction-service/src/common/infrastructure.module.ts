import { Module, Global } from '@nestjs/common';
import { InfisicalService } from './infisical.service';

@Global() // Делает модуль доступным во всем приложении без повторных импортов
@Module({
  providers: [InfisicalService],
  exports: [InfisicalService],
})
export class InfrastructureModule {}
