/* eslint-disable */

import { v2 } from '@google-cloud/translate';
import { Inject } from '@nestjs/common';
const { Translate } = v2;


export class Translator {

    constructor() {}

    async translation( googleTranslator : any, text : Array<string> | string, target_language : string ) : Promise<any> {
        let [translations] = await googleTranslator.translate(text, target_language);
        translations = Array.isArray(translations) ? translations : [translations];
        return translations;

    }

}