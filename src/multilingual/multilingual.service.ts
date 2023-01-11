/* eslint-disable */

import { v2 } from '@google-cloud/translate';
import { Inject } from '@nestjs/common';
import { response } from 'express';
const { Translate } = v2;
import { EntityManager } from 'typeorm';


export class Translator {

    constructor() {}

    async createEntity( request : any, table_en :string, entityManager : EntityManager, googleTranslator :any) :Promise<any> {
        try {

           if(request.language_code == 'en') {

            delete request.language_code;
           let response = await entityManager.getRepository(table_en).save(request);

            let toTranslate = await entityManager.getRepository('table_metadata').find({ where :{ main_table_name : table_en }, select: { translatable_fields : true } })
            // let con
            let config = await entityManager.getRepository('user_selected_languages').createQueryBuilder('user_selected_languages')
                                                                                        .leftJoinAndSelect('translation_services','translation_services','user_selected_languages.selected_service = translation_services.id')
                                                                                        .where("user_selected_languages.tenant_id =:tenantId", { tenantId:request.tenant_id })
                                                                                        .andWhere("user_selected_languages.org_id =:orgaId",{ orgaId:request.org_id })
                                                                                        .select([ 'user_selected_languages.selected_languages AS selected_languages', 'translation_services.service_name AS service_name'  ])
                                                                                        .getRawOne();
                                                                                     
            // let config = await entityManager.getRepository('supported_languages').find({ where : { tenant_id : request.tenant_id, org_id : request.org_id }, select : { selected_languages } })
            for(let j= 0; j<config.selected_languages.length; j++){
                if(config.selected_languages[j] == 'en'){}
                 else {
                    for(let i=0 ; i < toTranslate[0].translatable_fields.length ;i++) {
                        request[toTranslate[0].translatable_fields[i]] = await this.translation(googleTranslator, request[toTranslate[0].translatable_fields[i]], config.selected_languages[j])
                    }
                    let tableName = table_en+'_'+config.selected_languages[j]
                        await entityManager.getRepository(tableName).save(request);
                   
                }
            }
            

           } else {

           }

           return response;

        } catch(error) {

        }
    }

    async translation( googleTranslator : any, text : Array<string> | string, target_language : string ) : Promise<any> {
        let [translations] = await googleTranslator.translate(text, target_language);
        translations = Array.isArray(translations) ? translations : [translations];
        return translations[0];
    }

    // translate by service
    
    // 

}