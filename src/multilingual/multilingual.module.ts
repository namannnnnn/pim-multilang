import { Module } from '@nestjs/common';
import { Translator } from './multilingual.service';

@Module({
  imports: [],
  controllers: [],
  providers: [Translator],
})
export class MultilingualModule {}
