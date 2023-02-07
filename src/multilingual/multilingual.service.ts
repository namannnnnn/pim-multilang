/* eslint-disable */

import { v2 } from '@google-cloud/translate';
import { Inject } from '@nestjs/common';
import { response } from 'express';
const { Translate } = v2;
import { EntityManager, QueryRunner } from 'typeorm';

export class Translator {
    constructor() { }

    

    async updateEntity(request, table_en, entityManager, googleTranslator) {
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
            let og_translation = JSON.parse(JSON.stringify(request));
            delete og_translation.lang_code;
            let check = await this.checkTranslatable(request, table_en, entityManager, toTranslate[0]);
            if (check.check) {
                for (let j = 0; j < config.selected_languages.length; j++) {
                    let tableName = table_en + '_' + config.selected_languages[j];
                    if (config.selected_languages[j] == request.lang_code) {
                        if (config.selected_languages[j] == 'en') {
                            delete request.lang_code;
                            await entityManager.getRepository(table_en).update({ id: request.id, tenant_id: request.tenant_id, org_id: request.org_id }, Object.assign({}, request));
                        }
                        else {
                            delete request.lang_code;
                            await entityManager.getRepository(tableName).update({ id: request.id, tenant_id: request.tenant_id, org_id: request.org_id }, Object.assign({}, request));
                        }
                    }
                    else {
                        if (config.selected_languages[j] == 'en') {
                            for (let i = 0; i < check.translatable_fields.length; i++) {
                                og_translation[check.translatable_fields[i]] =
                                    await this.translation(googleTranslator, request[check.translatable_fields[i]], config.selected_languages[j]);
                            }
                            await entityManager.getRepository(table_en).update({ id: request.id, tenant_id: request.tenant_id, org_id: request.org_id }, Object.assign({}, og_translation));
                        }
                        else {
                            for (let i = 0; i < check.translatable_fields.length; i++) {
                                og_translation[check.translatable_fields[i]] =
                                    await this.translation(googleTranslator, request[check.translatable_fields[i]], config.selected_languages[j]);
                            }
                            await entityManager.getRepository(tableName).update({ id: request.id, tenant_id: request.tenant_id, org_id: request.org_id }, Object.assign({}, og_translation));
                        }
                    }
                }
            }
            else {
                for (let j = 0; j < config.selected_languages.length; j++) {
                    let tableName = table_en + '_' + config.selected_languages[j];
                    if (config.selected_languages[j] == 'en') {
                        delete request.lang_code;
                        await entityManager.getRepository(table_en).update({ id: request.id, tenant_id: request.tenant_id, org_id: request.org_id }, Object.assign({}, request));
                    }
                    else {
                        delete request.lang_code;
                        await entityManager.getRepository(tableName).update({ id: request.id, tenant_id: request.tenant_id, org_id: request.org_id }, Object.assign({}, request));
                    }
                }
            }
            return { status: 'success' };
        }
        catch (error) {
            return { status: 'error', message: error };
        }
    }

    async deleteEntity( request, table_en, entityManager:EntityManager ) {
        try {

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

            for(let i=0;i<config.selected_languages.length;i++) { 
                if(config.selected_languages[i] == 'en') {
                    await entityManager.getRepository(table_en).softDelete( { id: request.id, tenant_id: request.tenant_id, org_id:request.org_id} )
                } else {
                    let tableName = table_en+'_'+config.selected_languages[i]
                    await entityManager.getRepository(tableName).softDelete( { id: request.id, tenant_id: request.tenant_id, org_id:request.org_id} )

                }
            }    

            return { status:'success' }


        } catch(error){
            return { status: 'error', message: error };

        }
    }

    async pgTable ( request :any, table_en, entityManager:EntityManager ) {
        try {

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

            for(let i=0;i<config.selected_languages.length;i++) {
                if(config.selected_languages[i] == 'en'){
                } else {
                    let tableName = table_en + '_' + config.selected_languages[i];
                    await entityManager.query(`CREATE TABLE ${tableName} (LIKE ${table_en} INCLUDING ALL)`)
                }
            }


            return { status: 'success' };


        } catch(error){
            return { status: 'error', message: error };
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

    async checkTranslatable(request, table_en, entityManager, toTranslate) {
        try {
            let table_name;
            if (request.lang_code == 'en') {
                table_name = table_en;
            }
            else {
                table_name = table_en + '_' + request.lang_code;
            }
            let oldRequest = await entityManager.getRepository(table_name).find({ where: { id: request.id, tenant_id: request.tenant_id, org_id: request.org_id } });
            let check = false;
            let translatable_fields = [];
            for (let i = 0; i < toTranslate.translatable_fields.length; i++) {

                if (request[toTranslate.translatable_fields[i]] != oldRequest[toTranslate.translatable_fields[i]]) {
                    check = true;
                    translatable_fields.push(toTranslate.translatable_fields[i]);
                }
            }
            return { check, translatable_fields };
        }
        catch (error) {
            console.log(error);
        }
    }

    async createEntity(
        request: any,
        table_en: string,
        entityManager: EntityManager,
        googleTranslator: any,
        use_raw ?: boolean,

    ): Promise<any> {
        try {
            let data;
            let toTranslate = await entityManager
                .getRepository('table_metadata')
                .find({
                where: { main_table_name: table_en },
                select: { translatable_fields: true, id_column_name: true},
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
                delete og_translation.lang_code;
            if (!use_raw){
            if (request.lang_code == 'en') {
                delete request.lang_code;
                 data = await entityManager
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
                        og_translation[toTranslate[0].id_column_name] = request[toTranslate[0].id_column_name]
                        await entityManager.getRepository(tableName).save(og_translation);
                    }
                }
            }
            else {
                let language = request.lang_code;
                delete request.lang_code;
                let englishState = JSON.parse(JSON.stringify(request));
                let defaultState = JSON.parse(JSON.stringify(request))
                for (let i = 0; i < toTranslate[0].translatable_fields.length; i++) {
                    englishState[toTranslate[0].translatable_fields[i]] =
                        await this.translation(googleTranslator, englishState[toTranslate[0].translatable_fields[i]], 'en');
                }
                delete englishState.lang_code;
                let e = await entityManager.getRepository(table_en).save(englishState);
                let id = e[toTranslate[0].id_column_name]
                let tableNameDefualt = table_en + '_' + language;
                defaultState[toTranslate[0].id_column_name] = id;
                data = await entityManager.getRepository(tableNameDefualt).save(defaultState);
                for (let j = 0; j < config.selected_languages.length; j++) {
                    if (config.selected_languages[j] == 'en' ||
                        config.selected_languages[j] == language) {
                    }
                    else {
                        for (let i = 0; i < toTranslate[0].translatable_fields.length; i++) {
                            og_translation[toTranslate[0].translatable_fields[i]] =
                                await this.translation(googleTranslator, request[toTranslate[0].translatable_fields[i]], config.selected_languages[j]);
                        }
                        let tableName = table_en + '_' + config.selected_languages[j];
                        og_translation[toTranslate[0].id_column_name] = id;
                        let idd =await entityManager.getRepository(tableName).save(og_translation);
                    }
                }
            }
            return { status : 'success', response : data }
        }
        else{
            if (request.lang_code == 'en') {
                delete request.lang_code;
                data = await entityManager.connection.createQueryBuilder().insert().into(table_en).values(request).returning(toTranslate[0].id_column_name).execute();

                // let response = await entityManager.getRepository(table_en).save(request);
                    for (let j = 0; j < config.selected_languages.length; j++) {
                    if (config.selected_languages[j] == 'en') {
                    }
                    else {
                        let keys = Object.keys(request)
                        for (let k = 0; k <keys.length; k++) {
                            if (!((toTranslate[0].translatable_fields).includes(keys[k]))){
                                og_translation[keys[k]]=await this.translation(googleTranslator, request[keys[k]], config.selected_languages[j]);
                            }
                        }
                        let tableName = table_en + '_' + config.selected_languages[j];
                        og_translation[toTranslate[0].id_column_name] = request[toTranslate[0].id_column_name]
                        await entityManager.connection.createQueryBuilder().insert().into(tableName).values(og_translation).execute();
                        // await entityManager.getRepository(tableName).save(og_translation);
                    }
                }
            }
            else {
                let language = request.lang_code;
                delete request.lang_code;
                let englishState = JSON.parse(JSON.stringify(request));
                let defaultState = JSON.parse(JSON.stringify(request))
                let keys = Object.keys(request)
                for (let k = 0; k <keys.length; k++) {
                    if (!((toTranslate[0].translatable_fields).includes(keys[k]))){
                        englishState[keys[k]]=await this.translation(googleTranslator, englishState[keys[k]], 'en');
                    }
                }
                delete englishState.lang_code;
                let e = await entityManager.connection.createQueryBuilder().insert().into(table_en).values(englishState).execute();

                // let e = await entityManager.getRepository(table_en).save(englishState);
                let id = e[toTranslate[0].id_column_name]
                let tableNameDefualt = table_en + '_' + language;
                defaultState[toTranslate[0].id_column_name] = id;
                data = await entityManager.connection.createQueryBuilder().insert().into(tableNameDefualt).values(defaultState).returning(toTranslate[0].id_column_name).execute();

                // let ar = await entityManager.getRepository(tableNameDefualt).save(defaultState);
                for (let j = 0; j < config.selected_languages.length; j++) {
                    if (config.selected_languages[j] == 'en' ||
                        config.selected_languages[j] == language) {
                    }
                    else {
                        let keys = Object.keys(request)
                        for (let k = 0; k <keys.length; k++) {
                            if (!((toTranslate[0].translatable_fields).includes(keys[k]))){
                                og_translation[keys[k]]=await this.translation(googleTranslator, request[keys[k]], config.selected_languages[j]);
                            }
                        }
                        let tableName = table_en + '_' + config.selected_languages[j];
                        og_translation[toTranslate[0].id_column_name] = id;
                        let idd = await entityManager.connection.createQueryBuilder().insert().into(tableName).values(og_translation).execute();

                        // let idd =await entityManager.getRepository(tableName).save(og_translation);
                    }
                }
            }
            return { status : 'success', response : data.raw[0] }
        }
        }
        catch (error) {
            return { status:'error', message: error }
        }
    }

    
}
