import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MultilingualModule } from './multilingual/multilingual.module';

@Module({
  imports: [MultilingualModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
