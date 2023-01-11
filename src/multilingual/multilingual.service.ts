/* eslint-disable */

import { v2 } from '@google-cloud/translate';
import { Inject } from '@nestjs/common';
import { response } from 'express';
const { Translate } = v2;
import { EntityManager } from 'typeorm';

export class Translator {
    constructor() { }

    async createEntity(
        request: any,
        table_en: string,
        entityManager: EntityManager,
        googleTranslator: any,
    ): Promise<any> {
        try {
            let toTranslate = await entityManager
                .getRepository('table_metadata')
                .find({
                where: { main_table_name: table_en },
                select: { translatable_fields: true },
            });
            let config = await entityManager
                .getRepository('user_selected_languages')
                .createQueryBuilder('user_selected_languages')
                .leftJoinAndSelect('translation_services', 'translation_services', 'user_selected_languages.selected_service = translation_services.id')
                .where('user_selected_languages.tenant_id =:tenantId', {
                tenantId: request.tenant_id,
            })
                .andWhere('user_selected_languages.org_id =:orgaId', {
                orgaId: request.org_id,
            })
                .select([
                'user_selected_languages.selected_languages AS selected_languages',
                'translation_services.service_name AS service_name',
            ])
                .getRawOne();
                let og_translation = JSON.parse(JSON.stringify(request))
                // console.log(request)
                delete og_translation.language_code;

            // console.log(request)
            if (request.language_code == 'en') {
                delete request.language_code;
                let response = await entityManager
                    .getRepository(table_en)
                    .save(request);


                    for (let j = 0; j < config.selected_languages.length; j++) {
                    if (config.selected_languages[j] == 'en') {
                    }
                    else {
                        for (let i = 0; i < toTranslate[0].translatable_fields.length; i++) {
                            og_translation[toTranslate[0].translatable_fields[i]] =
                                await this.translation(googleTranslator, request[toTranslate[0].translatable_fields[i]], config.selected_languages[j]);
                        }
                        let tableName = table_en + '_' + config.selected_languages[j];
                        og_translation.id = request.id
                        await entityManager.getRepository(tableName).save(og_translation);
                    }
                }
            }
            else {
                let language = request.language_code;
                delete request.language_code;

                let englishState = JSON.parse(JSON.stringify(request));
                let defaultState = JSON.parse(JSON.stringify(request))
                for (let i = 0; i < toTranslate[0].translatable_fields.length; i++) {
                    englishState[toTranslate[0].translatable_fields[i]] =
                        await this.translation(googleTranslator, englishState[toTranslate[0].translatable_fields[i]], 'en');
                }
                delete englishState.language_code;
              

                let e = await entityManager.getRepository(table_en).save(englishState);
                let id = e.id
                let tableNameDefualt = table_en + '_' + language;
                defaultState.id = id;
                let ar = await entityManager.getRepository(tableNameDefualt).save(defaultState);
                for (let j = 0; j < config.selected_languages.length; j++) {
                    if (config.selected_languages[j] == 'en' ||
                        config.selected_languages[j] == language) {
                    }
                    else {
                        console.log(config.selected_languages[j]+"--------------ELSE")
                        for (let i = 0; i < toTranslate[0].translatable_fields.length; i++) {
                            og_translation[toTranslate[0].translatable_fields[i]] =
                                await this.translation(googleTranslator, request[toTranslate[0].translatable_fields[i]], config.selected_languages[j]);
                        }
                        let tableName = table_en + '_' + config.selected_languages[j];
                        og_translation.id = id;
                        let idd =await entityManager.getRepository(tableName).save(og_translation);
                    }
                }
            }
            return { status : 'success' }
        }
        catch (error) {
            return { status:'error', message: error }
        }
    }

    async updateEntity (
        request: any,
        table_en: string,
        entityManager: EntityManager,
        googleTranslator: any,
    ): Promise<any> {
        try {
            let toTranslate = await entityManager
                .getRepository('table_metadata')
                .find({
                where: { main_table_name: table_en },
                select: { translatable_fields: true },
            });
            let config = await entityManager
                .getRepository('user_selected_languages')
                .createQueryBuilder('user_selected_languages')
                .leftJoinAndSelect('translation_services', 'translation_services', 'user_selected_languages.selected_service = translation_services.id')
                .where('user_selected_languages.tenant_id =:tenantId', {
                tenantId: request.tenant_id,
            })
                .andWhere('user_selected_languages.org_id =:orgaId', {
                orgaId: request.org_id,
            })
                .select([
                'user_selected_languages.selected_languages AS selected_languages',
                'translation_services.service_name AS service_name',
            ])
                .getRawOne();

                let og_translation = JSON.parse(JSON.stringify(request))
                delete og_translation.language_code;

                for (let j = 0; j < config.selected_languages.length; j++) {
                    let tableName = table_en + '_' + request.language_code
                    if(config.selected_languages[j] == request.language_code) {
                        delete request.language_code
                        await entityManager.getRepository(tableName).update({id : request.id, tenant_id: request.tenant_id, org_id : request.org_id},{...request})
                    } else {
                        for (let i = 0; i < toTranslate[0].translatable_fields.length; i++) {
                            og_translation[toTranslate[0].translatable_fields[i]] =
                                await this.translation(googleTranslator, request[toTranslate[0].translatable_fields[i]], config.selected_languages[j]);
                        }
                        await entityManager.getRepository(tableName).update({id : request.id, tenant_id: request.tenant_id, org_id : request.org_id},{...og_translation})

                    }
                    
                }

                return { status : 'success' }

        } catch (error) {
            return { status:'error', message: error }
        }
    }

    
    async translation(
        googleTranslator: any,
        text: Array<string> | string,
        target_language: string,
    ): Promise<any> {
        let [translations] = await googleTranslator.translate(
            text,
            target_language,
        );
        translations = Array.isArray(translations) ? translations : [translations];
        return translations[0];
    }

    // translate by service

    //
}
