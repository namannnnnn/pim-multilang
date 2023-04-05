/* eslint-disable */

import { v2 } from '@google-cloud/translate';
import { google } from '@google-cloud/translate/build/protos/protos';
import { Inject } from '@nestjs/common';
import { response } from 'express';
const { Translate } = v2;
import { EntityManager, QueryRunner } from 'typeorm';

export class Translator {
    constructor() { }

    

    async updateEntity(request, table_en, entityManager, googleTranslator, use_raw?: boolean) {
        try {
            let toTranslate = await entityManager
                .getRepository('table_metadata')
                .find({
                where: { main_table_name: table_en },
                select: { translatable_fields: true, id_column_name:true },
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
            let check;
            if (!use_raw) {
                check = await this.checkTranslatable(request, table_en, entityManager, toTranslate[0]);
            }
            else {
                check = await this.checkNonTranslatable(request, table_en, entityManager, toTranslate[0]);
            }
            if (check.check) {
           
                for (let j = 0; j < config.selected_languages.length; j++) {
                    let tableName = table_en + '_' + config.selected_languages[j];
                   
                    if (config.selected_languages[j] == request.lang_code) {
                        if (config.selected_languages[j] == 'en') {
                            delete request.lang_code;
                            const whereClause = {}
                            whereClause[toTranslate[0]['id_column_name']] = request[toTranslate[0]['id_column_name']]
                            // await entityManager.getRepository(table_en).update({ tenant_id: request.tenant_id, org_id: request.org_id , ...whereClause}, Object.assign({}, request));
                            // await entityManager.query(`select * from pdm_in0004_or0001_1191 where pdm_id=1`)
                            const req = {...request}
                            delete req[toTranslate[0]['id_column_name']]
                            await entityManager.connection.createQueryBuilder().update(table_en).set(Object.assign({}, req))
                            .where(`${toTranslate[0]['id_column_name']} = :${toTranslate[0]['id_column_name']}`, whereClause)
                            .andWhere(`tenant_id=:tenant_id`,{tenant_id: request.tenant_id})
                            .andWhere(`org_id=:org_id`, {org_id: request.org_id}).execute()
                        }
                        else {
                            delete request.lang_code;
                            const whereClause = {}
                            whereClause[toTranslate[0]['id_column_name']] = request[toTranslate[0]['id_column_name']]
                            // await entityManager.getRepository(tableName).update({ tenant_id: request.tenant_id, org_id: request.org_id , ...whereClause}, Object.assign({}, request));
                            const req = {...request}
                            delete req[toTranslate[0]['id_column_name']]
                            await entityManager.connection.createQueryBuilder().update(tableName).set(Object.assign({}, req))
                            .where(`${toTranslate[0]['id_column_name']} = :${toTranslate[0]['id_column_name']}`, whereClause)
                            .andWhere(`tenant_id=:tenant_id`,{tenant_id: request.tenant_id})
                            .andWhere(`org_id=:org_id`, {org_id: request.org_id}).execute()
                        }
                    }
                    else {
                        if (config.selected_languages[j] == 'en') {
                            for (let i = 0; i < check.translatable_fields.length; i++) {
                                og_translation[check.translatable_fields[i]] =
                                    await this.translation(googleTranslator, request[check.translatable_fields[i]], config.selected_languages[j]);
                            }
                            const whereClause = {}
                            whereClause[toTranslate[0]['id_column_name']] = request[toTranslate[0]['id_column_name']]
                            // await entityManager.getRepository(table_en).update({  tenant_id: request.tenant_id, org_id: request.org_id, ...whereClause }, Object.assign({}, og_translation));
                            const req = {...request}
                            delete req[toTranslate[0]['id_column_name']]
                            await entityManager.connection.createQueryBuilder().update(table_en).set(Object.assign({}, og_translation))
                            .where(`${toTranslate[0]['id_column_name']} = :${toTranslate[0]['id_column_name']}`, whereClause)
                            .andWhere(`tenant_id=:tenant_id`,{tenant_id: request.tenant_id})
                            .andWhere(`org_id=:org_id`, {org_id: request.org_id}).execute()
                        }
                        else {
                            
                            for (let i = 0; i < check.translatable_fields.length; i++) {
                               
                                og_translation[check.translatable_fields[i]] = await this.translation(googleTranslator, request[check.translatable_fields[i]], config.selected_languages[j]);
                            }
                  
                            const whereClause = {}
                            whereClause[toTranslate[0]['id_column_name']] = request[toTranslate[0]['id_column_name']]
                            // await entityManager.getRepository(tableName).update({  tenant_id: request.tenant_id, org_id: request.org_id , ...whereClause}, Object.assign({}, og_translation));
                            const req = {...request}
                            delete req[toTranslate[0]['id_column_name']]
                            await entityManager.connection.createQueryBuilder().update(tableName).set(Object.assign({}, og_translation))
                            .where(`${toTranslate[0]['id_column_name']} = :${toTranslate[0]['id_column_name']}`, whereClause)
                            .andWhere(`tenant_id=:tenant_id`,{tenant_id: request.tenant_id})
                            .andWhere(`org_id=:org_id`, {org_id: request.org_id}).execute()
                        }
                    }
                }
            }
            else {
                for (let j = 0; j < config.selected_languages.length; j++) {
                    let tableName = table_en + '_' + config.selected_languages[j];
                    if (config.selected_languages[j] == 'en') {
                        delete request.lang_code;
                        const whereClause = {}
                        whereClause[toTranslate[0]['id_column_name']] = request[toTranslate[0]['id_column_name']]
                        // await entityManager.getRepository(table_en).update({ tenant_id: request.tenant_id, org_id: request.org_id, ...whereClause }, Object.assign({}, request));
                        const req = {...request}
                        delete req[toTranslate[0]['id_column_name']]
                        await entityManager.connection.createQueryBuilder().update(table_en).set(Object.assign({}, req))
                            .where(`${toTranslate[0]['id_column_name']} = :${toTranslate[0]['id_column_name']}`, whereClause)
                            .andWhere(`tenant_id=:tenant_id`,{tenant_id: request.tenant_id})
                            .andWhere(`org_id=:org_id`, {org_id: request.org_id}).execute()
                    }
                    else {
                        delete request.lang_code;
                        const whereClause = {}
                        whereClause[toTranslate[0]['id_column_name']] = request[toTranslate[0]['id_column_name']]
                        // await entityManager.getRepository(tableName).update({ tenant_id: request.tenant_id, org_id: request.org_id, ...whereClause }, Object.assign({}, request));
                        const req = {...request}
                            delete req[toTranslate[0]['id_column_name']]
                        await entityManager.connection.createQueryBuilder().update(tableName).set(Object.assign({}, req))
                            .where(`${toTranslate[0]['id_column_name']} = :${toTranslate[0]['id_column_name']}`, whereClause)
                            .andWhere(`tenant_id=:tenant_id`,{tenant_id: request.tenant_id})
                            .andWhere(`org_id=:org_id`, {org_id: request.org_id}).execute()
                    }
                }
            }
            return { status: 'success' };
        }
        catch (error) {
            return { status: 'error', message: error };
        }
    }

    async deleteEntity(request, table_en, entityManager) {
        // let use_raw=true
        let toTranslate = await entityManager
                .getRepository('table_metadata')
                .find({
                where: { main_table_name: table_en },
                select: { translatable_fields: true, id_column_name: true },
            });
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
            // if(!use_raw){
            //     for (let i = 0; i < config.selected_languages.length; i++) {
            //     if (config.selected_languages[i] == 'en') {
            //         await entityManager.getRepository(table_en).softDelete({ id: request.id, tenant_id: request.tenant_id, org_id: request.org_id });
            //     }
            //     else {
            //         let tableName = table_en + '_' + config.selected_languages[i];
            //         await entityManager.getRepository(tableName).softDelete({ id: request.id, tenant_id: request.tenant_id, org_id: request.org_id });
            //     }
            // }
            // }else{
                const whereClause = {}
                whereClause[toTranslate[0]['id_column_name']] = request[toTranslate[0]['id_column_name']]
                for(let i=0;i<config.selected_languages.length;i++) { 
                    if(config.selected_languages[i] == 'en') {
                    // await entityManager.getRepository(table_en).softDelete( { tenant_id: request.tenant_id, org_id:request.org_id, ...whereClause} )
                    await entityManager.connection.createQueryBuilder().update(table_en).set({deleted_at:new Date(Date.now()).toISOString()})
                    .where(`${toTranslate[0]['id_column_name']} = :${toTranslate[0]['id_column_name']}`, whereClause)
                    .andWhere(`tenant_id=:tenant_id`,{tenant_id: request.tenant_id})
                    .andWhere(`org_id=:org_id`, {org_id: request.org_id}).execute()
                } else {
                    let tableName = table_en+'_'+config.selected_languages[i]
                    // await entityManager.getRepository(tableName).softDelete( {  tenant_id: request.tenant_id, org_id:request.org_id, ...whereClause} )
                    await entityManager.connection.createQueryBuilder().update(tableName).set({deleted_at:new Date(Date.now()).toISOString()})
                    .where(`${toTranslate[0]['id_column_name']} = :${toTranslate[0]['id_column_name']}`, whereClause)
                    .andWhere(`tenant_id=:tenant_id`,{tenant_id: request.tenant_id})
                    .andWhere(`org_id=:org_id`, {org_id: request.org_id}).execute()
                }}
            // }
            return { status: 'success' };
        }
        catch (error) {
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
                    await entityManager.query(`CREATE TABLE attribute_masters (LIKE ${table_en} INCLUDING ALL)`)
                }
            }


            return { status: 'success' };


        } catch(error){
            return { status: 'error', message: error };
        }
    }

    async translation(googleTranslator, text, target_language) {
        if(typeof(text)==='string'){
            let [translations] = await googleTranslator.translate(text, target_language);
            translations = Array.isArray(translations) ? translations : [translations];
            return translations[0];
        }else {
            return text
        }
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

    async checkNonTranslatable(request, table_en, entityManager, toTranslate) {
        try {
           
            let table_name;
            if (request.lang_code == 'en') {
                table_name = table_en;
            }
            else {
                table_name = table_en + '_' + request.lang_code;
            }
            let oldRequest = await entityManager.query(`SELECT * FROM ${table_name} WHERE ${toTranslate['id_column_name']}=${request[toTranslate['id_column_name']]} AND tenant_id='${request.tenant_id}' AND org_id='${request.org_id}'`);
            let check = false;
            let translatable_fields = [];
            let keys = Object.keys(request);
            for (let k = 0; k < keys.length; k++) {
                if (!((toTranslate.translatable_fields).includes(keys[k]))) {
                    if (request[keys[k]] != oldRequest[keys[k]]) {
                        check = true;
                        translatable_fields.push(keys[k]);
                    }
                }
            }
            return { check, translatable_fields };
        }
        catch (error) {
            console.log(error);
        }
    }

    async createEntity(request, table_en, entityManager, googleTranslator, use_raw?: boolean) {
        try {
            let data;
            let toTranslate = await entityManager
                .getRepository('table_metadata')
                .find({
                where: { main_table_name: table_en },
                select: { translatable_fields: true, id_column_name: true },
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
            if (!use_raw) {
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
                            og_translation[toTranslate[0].id_column_name] = request[toTranslate[0].id_column_name];
                            await entityManager.getRepository(tableName).save(og_translation);
                        }
                    }
                }
                else {
                    let language = request.lang_code;
                    delete request.lang_code;
                    let englishState = JSON.parse(JSON.stringify(request));
                    let defaultState = JSON.parse(JSON.stringify(request));
                    for (let i = 0; i < toTranslate[0].translatable_fields.length; i++) {
                        englishState[toTranslate[0].translatable_fields[i]] =
                            await this.translation(googleTranslator, englishState[toTranslate[0].translatable_fields[i]], 'en');
                    }
                    delete englishState.lang_code;
                    let e = await entityManager.getRepository(table_en).save(englishState);
                    let id = e[toTranslate[0].id_column_name];
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
                            let idd = await entityManager.getRepository(tableName).save(og_translation);
                        }
                    }
                }
                return { status: 'success', response: data };
            }
            else {
                if (request.lang_code == 'en') {
                    delete request.lang_code;
                    data = await entityManager.connection.createQueryBuilder().insert().into(table_en).values(request).returning(toTranslate[0].id_column_name).execute();
                    for (let j = 0; j < config.selected_languages.length; j++) {
                        if (config.selected_languages[j] == 'en') {
                        }
                        else {
                            let keys = Object.keys(request);
                            for (let k = 0; k < keys.length; k++) {
                                if (!((toTranslate[0].translatable_fields).includes(keys[k]))) {
                                    og_translation[keys[k]] = await this.translation(googleTranslator, request[keys[k]], config.selected_languages[j]);
                                }
                            }
                            let tableName = table_en + '_' + config.selected_languages[j];
                            og_translation[toTranslate[0].id_column_name] = data.raw[0][toTranslate[0].id_column_name];
                            await entityManager.connection.createQueryBuilder().insert().into(tableName).values(og_translation).execute();
                        }
                    }
                }
                else {
                    let language = request.lang_code;
                    delete request.lang_code;
                    let englishState = JSON.parse(JSON.stringify(request));
                    let defaultState = JSON.parse(JSON.stringify(request));
                    let keys = Object.keys(request);
                    for (let k = 0; k < keys.length; k++) {
                        if (!((toTranslate[0].translatable_fields).includes(keys[k]))) {
                            englishState[keys[k]] = await this.translation(googleTranslator, englishState[keys[k]], 'en');
                        }
                    }
                    delete englishState.lang_code;
                    let e = await entityManager.connection.createQueryBuilder().insert().into(table_en).values(englishState).returning(toTranslate[0].id_column_name).execute();
                    let id = e.raw[0][toTranslate[0].id_column_name];
                    let tableNameDefualt = table_en + '_' + language;
                    defaultState[toTranslate[0].id_column_name] = id;
                    data = await entityManager.connection.createQueryBuilder().insert().into(tableNameDefualt).values(defaultState).returning(toTranslate[0].id_column_name).execute();
                    for (let j = 0; j < config.selected_languages.length; j++) {
                        if (config.selected_languages[j] == 'en' ||
                            config.selected_languages[j] == language) {
                        }
                        else {
                            let keys = Object.keys(request);
                            for (let k = 0; k < keys.length; k++) {
                                if (!((toTranslate[0].translatable_fields).includes(keys[k]))) {
                                    og_translation[keys[k]] = await this.translation(googleTranslator, request[keys[k]], config.selected_languages[j]);
                                }
                            }
                            let tableName = table_en + '_' + config.selected_languages[j];
                            og_translation[toTranslate[0].id_column_name] = id;
                            let idd = await entityManager.connection.createQueryBuilder().insert().into(tableName).values(og_translation).execute();
                        }
                    }
                }
                return { status: 'success', response: data.raw[0] };
            }
        }
        catch (error) {
            return { status: 'error', message: error };
        }
    }

    async createDocument(RuleModel, MultilingualModel, UserSelectedModel, request,collectionName, user , googleTranslator) {
        try {
            let data;
            let toTranslate = await MultilingualModel.aggregate([
                {$match: { main_table_name: collectionName }}
              ]);
            let config = await UserSelectedModel.find({ 'tenant_id': user.tenant_id, 'org_id': user.org_id }, "selected_service selected_languages");
            let og_translation = JSON.parse(JSON.stringify(request));
            delete og_translation.lang_code;
            if (request.lang_code == 'en') {
                let language = request.lang_code;
                delete request.lang_code;
                let rule = await new RuleModel(request);
                data = await rule.save();
                data._id = (data._id).toString();
                for (let i = 0; i < config[0].selected_languages.length; i++) {
                    if (config[0].selected_languages[i] == 'en') {
                    }
                    else {
                        (og_translation.translations)[config[0].selected_languages[i]] = ((request.translations).en);
                        for (let j = 0; j < toTranslate[0].translatable_fields.length; j++) {
                            if (toTranslate[0].translatable_fields[j] == 'conditions_2' || toTranslate[0].translatable_fields[j] == 'conditions_3' || toTranslate[0].translatable_fields[j] == 'setValue') {
                                switch (toTranslate[0].translatable_fields[j]) {
                                    case 'conditions_2':
                                        og_translation.translations[config[0].selected_languages[i]].conditions = await this.prcocessConditions(og_translation.translations[config[0].selected_languages[i]], googleTranslator, config[0].selected_languages[i]);
                                        break;
                                    case 'conditions_3':
                                        og_translation.translations[config[0].selected_languages[i]].conditions = await this.processConditionsThree(og_translation.translations[config[0].selected_languages[i]], googleTranslator, config[0].selected_languages[i]);
                                        break;
                                    case 'setValue':
                                        og_translation.translations[config[0].selected_languages[i]].setValue = await this.processSetValues(og_translation.translations[config[0].selected_languages[i]], googleTranslator, config[0].selected_languages[i]);
                                        break;
                                }
                            }
                            else {
                                (og_translation.translations[config[0].selected_languages[i]])[toTranslate[0].translatable_fields[j]] = await this.translation(googleTranslator, ((request.translations).en)[toTranslate[0].translatable_fields[j]], config[0].selected_languages[i]);
                            }
                        }
                    }
                }
                
                await RuleModel.updateOne({ _id: data._id }, Object.assign({}, og_translation));
            }
            else {
                let language = request.lang_code;
                delete request.lang_code;
                let englishState = JSON.parse(JSON.stringify(request));
                let defaultState = JSON.parse(JSON.stringify(request));
                for (let i = 0; i < toTranslate[0].translatable_fields.length; i++) {
                    if (toTranslate[0].translatable_fields[i] == 'conditions_2' || toTranslate[0].translatable_fields[i] == 'conditions_3' || toTranslate[0].translatable_fields[i] == 'setValue') {
                        switch (toTranslate[0].translatable_fields[i]) {
                            case 'conditions_2':
                                englishState.translations[config[0].selected_languages[i]].conditions = await this.prcocessConditions(englishState.translations[config[0].selected_languages[i]], googleTranslator, 'en');
                                break;
                            case 'conditions_3':
                                englishState.translations[config[0].selected_languages[i]].conditions = await this.processConditionsThree(englishState.translations[config[0].selected_languages[i]], googleTranslator, 'en');
                                break;
                            case 'setValue':
                                englishState.translations[config[0].selected_languages[i]].setValue = await this.processSetValues(englishState.translations[config[0].selected_languages[i]], googleTranslator, 'en');
                                break;
                        }
                    }
                    else {
                        englishState[toTranslate[0].translatable_fields[i]] = await this.translation(googleTranslator, (englishState.translations[language])[toTranslate[0].translatable_fields[i]], 'en');
                    }
                }
                delete englishState.lang_code;
                let e = await new RuleModel(request);
                let r = await e.save();
                for (let i = 0; i < config[0].selected_languages.length; i++) {
                    if (config[0].selected_languages[i] == 'en' || config[0].selected_languages[i] == language) {
                    }
                    else {
                        for (let j = 0; j < toTranslate[0].translatable_fields.length; j++) {
                            if (toTranslate[0].translatable_fields[j] == 'conditions_2' || toTranslate[0].translatable_fields[j] == 'conditions_3' || toTranslate[0].translatable_fields[j] == 'setValue') {
                                switch (toTranslate[0].translatable_fields[j]) {
                                    case 'conditions_2':
                                        og_translation.translations[config[0].selected_languages[i]].conditions = await this.prcocessConditions(og_translation.translations[config[0].selected_languages[i]], googleTranslator, config[0].selected_languages[i]);
                                        break;
                                    case 'conditions_3':
                                        og_translation.translations[config[0].selected_languages[i]].conditions = await this.processConditionsThree(og_translation.translations[config[0].selected_languages[i]], googleTranslator, config[0].selected_languages[i]);
                                        break;
                                    case 'setValue':
                                        og_translation.translations[config[0].selected_languages[i]].setValue = await this.processSetValues(og_translation.translations[config[0].selected_languages[i]], googleTranslator, config[0].selected_languages[i]);
                                        break;
                                }
                            }
                            else {
                                og_translation.translations[config[0].selected_languages[i]].toTranslate[0].translatable_fields[i] = await this.translation(googleTranslator, ((request.translations).en)[toTranslate[0].translatable_fields[j]], config[0].selected_languages[i]);
                            }
                            let rule = await new RuleModel(request);
                            data = await rule.save();
                        }
                    }
                }
            }
            return { status: 'success', response: data };
        }
        catch (error) {
            console.log(error);
        }
    }

    async updateDocument(RuleModel, MultilingualModel, UserSelectedModel, request,collectionName,user , googleTranslator) {
        try {
            let data;
            let toTranslate = await MultilingualModel.aggregate([
                {$match: { main_table_name: collectionName }}
              ]);
            let config = await UserSelectedModel.find({ 'tenant_id': user.tenant_id, 'org_id': user.org_id }, "selected_service selected_languages");
            let og_translation = JSON.parse(JSON.stringify(request));
            delete og_translation.lang_code;
            if (request.lang_code == 'en') {
                let language = request.lang_code;
                delete request.lang_code;
                data = await RuleModel.updateOne({ _id: request._id }, request);
                for (let i = 0; i < config[0].selected_languages.length; i++) {
                    if (config[0].selected_languages[i] == 'en') {
                    }
                    else {
                        (og_translation.translations)[config[0].selected_languages[i]] = ((request.translations).en);
                        for (let j = 0; j < toTranslate[0].translatable_fields.length; j++) {
                            if (toTranslate[0].translatable_fields[j] == 'conditions_2' || toTranslate[0].translatable_fields[j] == 'conditions_3' || toTranslate[0].translatable_fields[j] == 'setValue') {
                                switch (toTranslate[0].translatable_fields[j]) {
                                    case 'conditions_2':
                                        og_translation.translations[config[0].selected_languages[i]].conditions = await this.prcocessConditions(og_translation.translations[config[0].selected_languages[i]], googleTranslator, config[0].selected_languages[i]);
                                        break;
                                    case 'conditions_3':
                                        og_translation.translations[config[0].selected_languages[i]].conditions = await this.processConditionsThree(og_translation.translations[config[0].selected_languages[i]], googleTranslator, config[0].selected_languages[i]);
                                        break;
                                    case 'setValue':
                                        og_translation.translations[config[0].selected_languages[i]].setValue = await this.processSetValues(og_translation.translations[config[0].selected_languages[i]], googleTranslator, config[0].selected_languages[i]);
                                        break;
                                }
                            }
                            else {
                                (og_translation.translations[config[0].selected_languages[i]])[toTranslate[0].translatable_fields[j]] = await this.translation(googleTranslator, ((request.translations).en)[toTranslate[0].translatable_fields[j]], config[0].selected_languages[i]);
                            }
                        }
                    }
                }
                data = await RuleModel.updateOne({ _id: og_translation._id }, og_translation);
            } else {
                data = await RuleModel.updateOne({ _id: request._id }, request);
            }
        } catch(error) {
            console.log(error);
        }
    }
    async prcocessConditions(rule, googleTranslator, lang_code) {
        try {
            if (rule.conditions.any) {
                for (let i = 0; i < rule.conditions.any.length; i++) {
                    if (rule.conditions.any[i].all) {
                        for (let j = 0; j < rule.conditions.any[i].all.length; j++) {
                            if ((rule.conditions.any[i].all[j]).conditionalAttributeName == "") {
                                if ((rule.conditions.any[i].all[j]).value[1] == 0 && (rule.conditions.any[i].all[j]).value[2] == 0) {
                                    if (((rule.conditions.any[i].all[j]).attributeType) == 'int' || (rule.conditions.any[i].all[j]).attributeType == 'float' || (rule.conditions.any[i].all[j]).attributeType == 'int') {
                                    }
                                    else {
                                        (rule.conditions.any[i].all[j]).value[0] = await this.translation(googleTranslator, (rule.conditions.any[i].all[j]).value[0], lang_code);
                                    }
                                }
                                else {
                                    if (((rule.conditions.any[i].all[j]).attributeType) == 'int' || (rule.conditions.any[i].all[j]).attributeType == 'float' || (rule.conditions.any[i].all[j]).attributeType == 'int') {
                                    }
                                    else {
                                        (rule.conditions.any[i].all[j]).value[0] = await this.translation(googleTranslator, (rule.conditions.any[i].all[j]).value[0], lang_code);
                                    }
                                }
                            }
                            else {
                                if ((rule.conditions.any[i].all[j]).value[1] == 0 && (rule.conditions.any[i].all[j]).value[2] == 0) {
                                    if (((rule.conditions.any[i].all[j]).conditionalAttributeType) == 'int' || (rule.conditions.any[i].all[j]).conditionalAttributeType == 'float' || (rule.conditions.any[i].all[j]).conditionalAttributeType == 'int') {
                                    }
                                    else {
                                    }
                                }
                                else {
                                    if (((rule.conditions.any[i].all[j]).attributeType) == 'int' || (rule.conditions.any[i].all[j]).attributeType == 'float' || (rule.conditions.any[i].all[j]).attributeType == 'int') {
                                    }
                                    else {
                                    }
                                }
                            }
                        }
                    }
                    if (rule.conditions.any[i].any) {
                        for (let k = 0; k < rule.conditions.any[i].any.length; k++) {
                            if ((rule.conditions.any[i].any[k]).conditionalAttributeName == "") {
                                if ((rule.conditions.any[i].any[k]).value[1] == 0 && (rule.conditions.any[i].any[k]).value[2] == 0) {
                                    if (((rule.conditions.any[i].any[k]).attributeType) == 'int' || (rule.conditions.any[i].any[k]).attributeType == 'float' || (rule.conditions.any[i].any[k]).attributeType == 'int') {
                                    }
                                    else {
                                        (rule.conditions.any[i].any[k]).value[0] = await this.translation(googleTranslator, (rule.conditions.any[i].any[k]).value[0], lang_code);
                                    }
                                }
                                else {
                                    if (((rule.conditions.any[i].any[k]).attributeType) == 'int' || (rule.conditions.any[i].any[k]).attributeType == 'float' || (rule.conditions.any[i].any[k]).attributeType == 'int') {
                                    }
                                    else {
                                        (rule.conditions.any[i].any[k]).value[0] = await this.translation(googleTranslator, (rule.conditions.any[i].any[k]).value[0], lang_code);
                                    }
                                }
                            }
                            else {
                                if ((rule.conditions.any[i].any[k]).value[1] == 0 && (rule.conditions.any[i].any[k]).value[2] == 0) {
                                    if (((rule.conditions.any[i].any[k]).conditionalAttributeType) == 'int' || (rule.conditions.any[i].any[k]).conditionalAttributeType == 'float' || (rule.conditions.any[i].any[k]).conditionalAttributeType == 'int') {
                                    }
                                    else {
                                    }
                                }
                                else {
                                    if (((rule.conditions.any[i].any[k]).attributeType) == 'int' || (rule.conditions.any[i].any[k]).attributeType == 'float' || (rule.conditions.any[i].any[k]).attributeType == 'int') {
                                    }
                                    else {
                                    }
                                }
                            }
                        }
                    }
                    if (rule.conditions.any[i].internal) {
                        for (let l = 0; l < rule.conditions.any[i].internal.length; l++) {
                            if ((rule.conditions.any[i].internal[l]).conditionalAttributeName == "") {
                                if ((rule.conditions.any[i].internal[l]).value[1] == 0 && (rule.conditions.any[i].internal[l]).value[2] == 0) {
                                    if (((rule.conditions.any[i].internal[l]).attributeType) == 'int' || (rule.conditions.any[i].internal[l]).attributeType == 'float' || (rule.conditions.any[i].internal[l]).attributeType == 'int') {
                                    }
                                    else {
                                        (rule.conditions.any[i].internal[l]).value[0] = await this.translation(googleTranslator, (rule.conditions.any[i].internal[l]).value[0], lang_code);
                                    }
                                }
                                else {
                                    if (((rule.conditions.any[i].internal[l]).attributeType) == 'int' || (rule.conditions.any[i].internal[l]).attributeType == 'float' || (rule.conditions.any[i].internal[l]).attributeType == 'int') {
                                    }
                                    else {
                                        (rule.conditions.any[i].internal[l]).value[0] = await this.translation(googleTranslator, (rule.conditions.any[i].internal[l]).value[0], lang_code);

                                    }
                                }
                            }
                            else {
                                if ((rule.conditions.any[i].internal[l]).value[1] == 0 && (rule.conditions.any[i].internal[l]).value[2] == 0) {
                                    if (((rule.conditions.any[i].internal[l]).conditionalAttributeType) == 'int' || (rule.conditions.any[i].internal[l]).conditionalAttributeType == 'float' || (rule.conditions.any[i].internal[l]).conditionalAttributeType == 'int') {
                                    }
                                    else { }
                                }
                                else {
                                    if (((rule.conditions.any[i].internal[l]).attributeType) == 'int' || (rule.conditions.any[i].internal[l]).attributeType == 'float' || (rule.conditions.any[i].internal[l]).attributeType == 'int') {
                                    }
                                    else {
                                    }
                                }
                            }
                        }
                    }
                }
            }
            else {
                if (rule.conditions.all) {
                    for (let i = 0; i < rule.conditions.all.length; i++) {
                        if (rule.conditions.all[i].all) {
                            for (let j = 0; j < rule.conditions.all[i].all.length; j++) {
                                if ((rule.conditions.all[i].all[j]).conditionalAttributeName == "") {
                                    if ((rule.conditions.all[i].all[j]).value[1] == 0 && (rule.conditions.all[i].all[j]).value[2] == 0) {
                                        if (((rule.conditions.all[i].all[j]).attributeType) == 'int' || (rule.conditions.all[i].all[j]).attributeType == 'float' || (rule.conditions.all[i].all[j]).attributeType == 'int') {
                                        }
                                        else {
                                            (rule.conditions.all[i].all[j]).value[0] = await this.translation(googleTranslator, (rule.conditions.all[i].all[j]).value[0], lang_code);
                                        }
                                    }
                                    else {
                                        if (((rule.conditions.all[i].all[j]).attributeType) == 'int' || (rule.conditions.all[i].all[j]).attributeType == 'float' || (rule.conditions.all[i].all[j]).attributeType == 'int') {
                                        }
                                        else {
                                            (rule.conditions.all[i].all[j]).value[0] = await this.translation(googleTranslator, (rule.conditions.all[i].all[j]).value[0], lang_code);
                                        }
                                    }
                                }
                                else {
                                    if ((rule.conditions.all[i].all[j]).value[1] == 0 && (rule.conditions.all[i].all[j]).value[2] == 0) {
                                        if (((rule.conditions.all[i].all[j]).conditionalAttributeType) == 'int' || (rule.conditions.all[i].all[j]).conditionalAttributeType == 'float' || (rule.conditions.all[i].all[j]).conditionalAttributeType == 'int') { }
                                        else { }
                                    }
                                    else {
                                        if (((rule.conditions.all[i].all[j]).attributeType) == 'int' || (rule.conditions.all[i].all[j]).attributeType == 'float' || (rule.conditions.all[i].all[j]).attributeType == 'int') {
                                        }
                                        else {
                                        }
                                    }
                                }
                            }
                        }
                        if (rule.conditions.all[i].any) {
                            for (let k = 0; k < rule.conditions.all[i].any.length; k++) {
                                if ((rule.conditions.all[i].any[k]).conditionalAttributeName == "") {
                                    if ((rule.conditions.all[i].any[k]).value[1] == 0 && (rule.conditions.all[i].any[k]).value[2] == 0) {
                                        if (((rule.conditions.all[i].any[k]).attributeType) == 'int' || (rule.conditions.all[i].any[k]).attributeType == 'float' || (rule.conditions.all[i].any[k]).attributeType == 'int') {
                                        }
                                        else {
                                            (rule.conditions.all[i].any[k]).value[0] = await this.translation(googleTranslator, (rule.conditions.all[i].any[k]).value[0], lang_code);
                                        }
                                    }
                                    else {
                                        if (((rule.conditions.all[i].any[k]).attributeType) == 'int' || (rule.conditions.all[i].any[k]).attributeType == 'float' || (rule.conditions.all[i].any[k]).attributeType == 'int') {
                                        }
                                        else {
                                            (rule.conditions.all[i].any[k]).value[0] = await this.translation(googleTranslator, (rule.conditions.all[i].any[k]).value[0], lang_code);
                                        }
                                    }
                                }
                                else {
                                    if ((rule.conditions.all[i].any[k]).value[1] == 0 && (rule.conditions.all[i].any[k]).value[2] == 0) {
                                        if (((rule.conditions.all[i].any[k]).conditionalAttributeType) == 'int' || (rule.conditions.all[i].any[k]).conditionalAttributeType == 'float' || (rule.conditions.all[i].any[k]).conditionalAttributeType == 'int') {
                                        }
                                        else {
                                        }
                                    }
                                    else {
                                        if (((rule.conditions.all[i].any[k]).attributeType) == 'int' || (rule.conditions.all[i].any[k]).attributeType == 'float' || (rule.conditions.all[i].any[k]).attributeType == 'int') {
                                        }
                                        else {
                                        }
                                    }
                                }
                            }
                        }
                        if (rule.conditions.all[i].internal) {
                            for (let l = 0; l < rule.conditions.all[i].internal.length; l++) {
                                if ((rule.conditions.all[i].internal[l]).conditionalAttributeName == "") {
                                    if ((rule.conditions.all[i].internal[l]).value[1] == 0 && (rule.conditions.all[i].internal[l]).value[2] == 0) {
                                        if (((rule.conditions.all[i].internal[l]).attributeType) == 'int' || (rule.conditions.all[i].internal[l]).attributeType == 'float' || (rule.conditions.all[i].internal[l]).attributeType == 'int') {
                                        }
                                        else {
                                            (rule.conditions.all[i].internal[l]).value[0] = await this.translation(googleTranslator, (rule.conditions.all[i].internal[l]).value[0], lang_code);
                                        }
                                    }
                                    else {
                                        if (((rule.conditions.all[i].internal[l]).attributeType) == 'int' || (rule.conditions.all[i].internal[l]).attributeType == 'float' || (rule.conditions.all[i].internal[l]).attributeType == 'int') {
                                        }
                                        else {
                                            (rule.conditions.all[i].internal[l]).value[0] = await this.translation(googleTranslator, (rule.conditions.all[i].internal[l]).value[0], lang_code);
                                        }
                                    }
                                }
                                else {
                                    if ((rule.conditions.all[i].internal[l]).value[1] == 0 && (rule.conditions.all[i].internal[l]).value[2] == 0) {
                                        if (((rule.conditions.all[i].internal[l]).conditionalAttributeType) == 'int' || (rule.conditions.all[i].internal[l]).conditionalAttributeType == 'float' || (rule.conditions.all[i].internal[l]).conditionalAttributeType == 'int') {
                                        }
                                        else {
                                        }
                                    }
                                    else {
                                        if (((rule.conditions.all[i].internal[l]).attributeType) == 'int' || (rule.conditions.all[i].internal[l]).attributeType == 'float' || (rule.conditions.all[i].internal[l]).attributeType == 'int') {
                                        }
                                        else {
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
            return rule.conditions;
        }
        catch (error) {
            console.log(error);
        }
    }

    async processConditionsThree(rule, googleTranslator, lang_code) {

        try{ 
            if(rule.conditions.all) {
                for(let m =0; m < rule.conditions.all.length; m++) {
                    if(rule.conditions.all[m].all){
                        // ----------------------------------------------------------------AND--------------------------------------------------------------
                        for( let i = 0; i < rule.conditions.all[m].all.length; i++ ){
                            if(rule.conditions.all[m].all[i].all){
                                for( let j =0; j < rule.conditions.all[m].all[i].all.length ; j++ ){
                                    if((rule.conditions.all[m].all[i].all[j]).conditionalAttributeName == ""){ 
            
                                        if((rule.conditions.all[m].all[i].all[j]).value[1] ==0 && (rule.conditions.all[m].all[i].all[j]).value[2]==0){
                                            if( ((rule.conditions.all[m].all[i].all[j]).attributeType) == 'int' || (rule.conditions.all[m].all[i].all[j]).attributeType == 'float'|| (rule.conditions.all[m].all[i].all[j]).attributeType == 'int'  ) {
                                            }else {
                                                 (rule.conditions.all[m].all[i].all[j]).value[0] = await this.translation(googleTranslator,(rule.conditions.all[m].all[i].all[j]).value[0], lang_code )
                                            }
                                        } else {
                                            if( ((rule.conditions.all[m].all[i].all[j]).attributeType) == 'int' || (rule.conditions.all[m].all[i].all[j]).attributeType == 'float'|| (rule.conditions.all[m].all[i].all[j]).attributeType == 'int'  ) {
                                            }else {
                                                (rule.conditions.all[m].all[i].all[j]).value[0] = await this.translation(googleTranslator,(rule.conditions.all[m].all[i].all[j]).value[0], lang_code )
                                            }
                                        }
                                    } else { 
                                        if((rule.conditions.all[m].all[i].all[j]).value[1] ==0 && (rule.conditions.all[m].all[i].all[j]).value[2]==0){
                                            if( ((rule.conditions.all[m].all[i].all[j]).conditionalAttributeType) == 'int' || (rule.conditions.all[m].all[i].all[j]).conditionalAttributeType == 'float'|| (rule.conditions.all[m].all[i].all[j]).conditionalAttributeType == 'int'  ) {
                                            }else {
                                            }
                                        } else {
                                            if( ((rule.conditions.all[m].all[i].all[j]).attributeType) == 'int' || (rule.conditions.all[m].all[i].all[j]).attributeType == 'float'|| (rule.conditions.all[m].all[i].all[j]).attributeType == 'int'  ) {
                                            }else {
                                            }
                                        }
                                    }
                                }
                            }
                            if(rule.conditions.all[m].all[i].any){
                                for ( let k =0; k < rule.conditions.all[m].all[i].any.length ; k++){
                                    if((rule.conditions.all[m].all[i].any[k]).conditionalAttributeName == ""){ 
            
                                        if((rule.conditions.all[m].all[i].any[k]).value[1] ==0 && (rule.conditions.all[m].all[i].any[k]).value[2]==0){
                                            if( ((rule.conditions.all[m].all[i].any[k]).attributeType) == 'int' || (rule.conditions.all[m].all[i].any[k]).attributeType == 'float'|| (rule.conditions.all[m].all[i].any[k]).attributeType == 'int'  ) {
                                            }else {
                                                (rule.conditions.all[m].all[i].any[k]).value[0] = await this.translation(googleTranslator,(rule.conditions.all[m].all[i].any[k]).value[0], lang_code )
                                            }
                                        } else {
                                            if( ((rule.conditions.all[m].all[i].any[k]).attributeType) == 'int' || (rule.conditions.all[m].all[i].any[k]).attributeType == 'float'|| (rule.conditions.all[m].all[i].any[k]).attributeType == 'int'  ) {
                                            }else {
                                                (rule.conditions.all[m].all[i].any[k]).value[0] = await this.translation(googleTranslator,(rule.conditions.all[m].all[i].any[k]).value[0], lang_code )
                                            }
                                        }
                                    } else { 
                                        if((rule.conditions.all[m].all[i].any[k]).value[1] ==0 && (rule.conditions.all[m].all[i].any[k]).value[2]==0){
                                            if( ((rule.conditions.all[m].all[i].any[k]).conditionalAttributeType) == 'int' || (rule.conditions.all[m].all[i].any[k]).conditionalAttributeType == 'float'|| (rule.conditions.all[m].all[i].any[k]).conditionalAttributeType == 'int'  ) {
                                            }else {
                                            }
                                        } else {
                                            if( ((rule.conditions.all[m].all[i].any[k]).attributeType) == 'int' || (rule.conditions.all[m].all[i].any[k]).attributeType == 'float'|| (rule.conditions.all[m].all[i].any[k]).attributeType == 'int'  ) {
                                            }else {
                                            }
                                        }
                                    }
                                }
                            }
                            if(rule.conditions.all[m].all[i].internal){
                                for ( let l =0; l < rule.conditions.all[m].all[i].internal.length; l++){
                                if((rule.conditions.all[m].all[i].internal[l]).conditionalAttributeName == ""){ 
            
                                    if((rule.conditions.all[m].all[i].internal[l]).value[1] ==0 && (rule.conditions.all[m].all[i].internal[l]).value[2]==0){
                                        if( ((rule.conditions.all[m].all[i].internal[l]).attributeType) == 'int' || (rule.conditions.all[m].all[i].internal[l]).attributeType == 'float'|| (rule.conditions.all[m].all[i].internal[l]).attributeType == 'int'  ) {
                                        }else {
                                            (rule.conditions.all[m].all[i].internal[l]).value[0] = await this.translation(googleTranslator,(rule.conditions.all[m].all[i].internal[l]).value[0], lang_code )
                                        }
                                    } else {
                                        if( ((rule.conditions.all[m].all[i].internal[l]).attributeType) == 'int' || (rule.conditions.all[m].all[i].internal[l]).attributeType == 'float'|| (rule.conditions.all[m].all[i].internal[l]).attributeType == 'int'  ) {

                                        }else {
                                            (rule.conditions.all[m].all[i].internal[l]).value[0] = await this.translation(googleTranslator,(rule.conditions.all[m].all[i].internal[l]).value[0], lang_code )
                                        }
                                    }
                                } else { 
                                    if((rule.conditions.all[m].all[i].internal[l]).value[1] ==0 && (rule.conditions.all[m].all[i].internal[l]).value[2]==0){
                                        if( ((rule.conditions.all[m].all[i].internal[l]).conditionalAttributeType) == 'int' || (rule.conditions.all[m].all[i].internal[l]).conditionalAttributeType == 'float'|| (rule.conditions.all[m].all[i].internal[l]).conditionalAttributeType == 'int'  ) {
                                        }else {
                                        }
                                    } else {
                                        if( ((rule.conditions.all[m].all[i].internal[l]).attributeType) == 'int' || (rule.conditions.all[m].all[i].internal[l]).attributeType == 'float'|| (rule.conditions.all[m].all[i].internal[l]).attributeType == 'int'  ) {
                                        }else {
                                        }
                                    }
                                }
                                }
                            }
                    }
                }
                    if(rule.conditions.all[m].any){
                       // ----------------------------------------------------------------OR----------------------------------------------------------------
                        for( let i = 0; i < rule.conditions.all[m].any.length; i++ ){
                            if(rule.conditions.all[m].any[i].all){
                                for( let j =0; j < rule.conditions.all[m].any[i].all.length; j++ ){
                                    if((rule.conditions.all[m].any[i].all[j]).conditionalAttributeName == ""){ 
                
                                        if((rule.conditions.all[m].any[i].all[j]).value[1] ==0 && (rule.conditions.all[m].any[i].all[j]).value[2]==0){
                                            if( ((rule.conditions.all[m].any[i].all[j]).attributeType) == 'int' || (rule.conditions.all[m].any[i].all[j]).attributeType == 'float'|| (rule.conditions.all[m].any[i].all[j]).attributeType == 'int'  ) {
                                            }else {
                                                (rule.conditions.all[m].any[i].all[j]).value[0] = await this.translation(googleTranslator,(rule.conditions.all[m].any[i].all[j]).value[0], lang_code )
                                            }
                                        } else {
                                            if( ((rule.conditions.all[m].any[i].all[j]).attributeType) == 'int' || (rule.conditions.all[m].any[i].all[j]).attributeType == 'float'|| (rule.conditions.all[m].any[i].all[j]).attributeType == 'int'  ) {
                                            }else {
                                                (rule.conditions.all[m].any[i].all[j]).value[0] = await this.translation(googleTranslator,(rule.conditions.all[m].any[i].all[j]).value[0], lang_code )
                                            }
                                        }
                                    } else { 
                                        if((rule.conditions.all[m].any[i].all[j]).value[1] ==0 && (rule.conditions.all[m].any[i].all[j]).value[2]==0){
                                            if( ((rule.conditions.all[m].any[i].all[j]).conditionalAttributeType) == 'int' || (rule.conditions.all[m].any[i].all[j]).conditionalAttributeType == 'float'|| (rule.conditions.all[m].any[i].all[j]).conditionalAttributeType == 'int'  ) {
                                            }else {
                                            }
                                        } else {
                                            if( ((rule.conditions.all[m].any[i].all[j]).attributeType) == 'int' || (rule.conditions.all[m].any[i].all[j]).attributeType == 'float'|| (rule.conditions.all[m].any[i].all[j]).attributeType == 'int'  ) {
                                            }else {
                                            }
                                        }
                                    }
                                }
                            }
                            if(rule.conditions.all[m].any[i].any){
                                for ( let k =0; k < rule.conditions.all[m].any[i].any.length; k++){

                                    if((rule.conditions.all[m].any[i].any[k]).conditionalAttributeName == ""){ 
                
                                        if((rule.conditions.all[m].any[i].any[k]).value[1] ==0 && (rule.conditions.all[m].any[i].any[k]).value[2]==0){
                                            if( ((rule.conditions.all[m].any[i].any[k]).attributeType) == 'int' || (rule.conditions.all[m].any[i].any[k]).attributeType == 'float'|| (rule.conditions.all[m].any[i].any[k]).attributeType == 'int'  ) {
                                            }else {
                                                (rule.conditions.all[m].any[i].any[k]).value[0] = await this.translation(googleTranslator,(rule.conditions.all[m].any[i].any[k]).value[0], lang_code )
                                            }
                                        } else {
                                            if( ((rule.conditions.all[m].any[i].any[k]).attributeType) == 'int' || (rule.conditions.all[m].any[i].any[k]).attributeType == 'float'|| (rule.conditions.all[m].any[i].any[k]).attributeType == 'int'  ) {
                                            }else {
                                                (rule.conditions.all[m].any[i].any[k]).value[0] = await this.translation(googleTranslator,(rule.conditions.all[m].any[i].any[k]).value[0], lang_code )
                                            }
                                        }
                                    } else { 
                                        if((rule.conditions.all[m].any[i].any[k]).value[1] ==0 && (rule.conditions.all[m].any[i].any[k]).value[2]==0){
                                            if( ((rule.conditions.all[m].any[i].any[k]).conditionalAttributeType) == 'int' || (rule.conditions.all[m].any[i].any[k]).conditionalAttributeType == 'float'|| (rule.conditions.all[m].any[i].any[k]).conditionalAttributeType == 'int'  ) {
                                            }else {
                                            }
                                        } else {
                                            if( ((rule.conditions.all[m].any[i].any[k]).attributeType) == 'int' || (rule.conditions.all[m].any[i].any[k]).attributeType == 'float'|| (rule.conditions.all[m].any[i].any[k]).attributeType == 'int'  ) {
                                            }else {
                                            }
                                        }
                                    }
                                }
                            }
                            if(rule.conditions.all[m].any[i].internal){
                                for ( let l =0; l < rule.conditions.all[m].any[i].internal.length; l++){
                                    if((rule.conditions.all[m].any[i].internal[l]).conditionalAttributeName == ""){ 
                
                                        if((rule.conditions.all[m].any[i].internal[l]).value[1] ==0 && (rule.conditions.all[m].any[i].internal[l]).value[2]==0){
                                            if( ((rule.conditions.all[m].any[i].internal[l]).attributeType) == 'int' || (rule.conditions.all[m].any[i].internal[l]).attributeType == 'float'|| (rule.conditions.all[m].any[i].internal[l]).attributeType == 'int'  ) {
                                            }else {
                                                (rule.conditions.all[m].any[i].internal[l]).value[0] = await this.translation(googleTranslator,(rule.conditions.all[m].any[i].internal[l]).value[0], lang_code )
                                            }
                                        } else {
                                            if( ((rule.conditions.all[m].any[i].internal[l]).attributeType) == 'int' || (rule.conditions.all[m].any[i].internal[l]).attributeType == 'float'|| (rule.conditions.all[m].any[i].internal[l]).attributeType == 'int'  ) {
                                            }else {
                                                (rule.conditions.all[m].any[i].internal[l]).value[0] = await this.translation(googleTranslator,(rule.conditions.all[m].any[i].internal[l]).value[0], lang_code )
                                            }
                                        }
                                    } else { 
                                        if((rule.conditions.all[m].any[i].internal[l]).value[1] ==0 && (rule.conditions.all[m].any[i].internal[l]).value[2]==0){
                                            if( ((rule.conditions.all[m].any[i].internal[l]).conditionalAttributeType) == 'int' || (rule.conditions.all[m].any[i].internal[l]).conditionalAttributeType == 'float'|| (rule.conditions.all[m].any[i].internal[l]).conditionalAttributeType == 'int'  ) {
                                            }else {
                                            }
                                        } else {
                                            if( ((rule.conditions.all[m].any[i].internal[l]).attributeType) == 'int' || (rule.conditions.all[m].any[i].internal[l]).attributeType == 'float'|| (rule.conditions.all[m].any[i].internal[l]).attributeType == 'int'  ) {
                                            }else {
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        } catch (error) {
            console.log(error);
        }

    }

    async processSetValues(rule, googleTranslator, lang_code) {
        try {
            for (let i = 0; i < rule.setValue.length; i++) {
                if (rule.setValue[i].attributeType == 'varchar') {
                    rule.setValue[i].value = await this.translation(googleTranslator, rule.setValue[i].value, lang_code);
                }
            }
            return rule.setValue
        }
        catch (error) {
            console.log(error);
        }
    }


    
}

