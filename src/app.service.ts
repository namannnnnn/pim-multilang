/* eslint-disable */

import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { v2 } from '@google-cloud/translate';
const { Translate } = v2;

@Injectable()
export class AppService {


  constructor(

  //   @Inject(forwardRef(() => Translator))
  //  private service : Translator

  ) {}

  async getHello(): Promise<any> {


  //   let googleTranslator = new Translate({
  //     projectId:'intricate-yew-367406',
  //     keyFilename: '/Users/dhavalparmar/Downloads/intricate-yew-367406-11ca22daf11d.json'
      
  //     // String(process.env.GOOGLE_APPLICATION_CREDENTIALS)
  // })


  // let a = await this.service.translation( googleTranslator, 'Hello Wordld', 'id');
  return 'return';
  }
}
