import { Global, Module } from '@nestjs/common';
import { KetoService } from './keto.service';

@Global()
@Module({
  providers: [KetoService],
  exports: [KetoService],
})
export class KetoModule {}
