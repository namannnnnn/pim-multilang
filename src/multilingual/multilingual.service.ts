/* eslint-disable */

import { v2 } from '@google-cloud/translate';
import { google } from '@google-cloud/translate/build/protos/protos';
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
                let defaultState = JSON.parse(JSON.stringify(request));
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

    async createDocument ( RuleModel : any, MultilingualModel :any, UserSelectedModel : any ,request : any, googleTranslator : any) {

        try {
            let data;
            let toTranslate = await MultilingualModel.find({ 'name': "table_metadata", 'main_table_name': "defaultrules" });
            let config = await UserSelectedModel.find({ 'tenant_id': (request.translations[request.lang_code]).tenant_id, 'org_id': (request.translations[request.lang_code]).org_id }, "selected_service selected_languages");
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
                        (og_translation.translations)[config[0].selected_languages[i]] = ((request.translations).en)
                        for (let j = 0; j < toTranslate[0].translatable_fields.length; j++) {
                            if (toTranslate[0].translatable_fields[j] == 'conditions_2' || toTranslate[0].translatable_fields[j] == 'conditions_3' || toTranslate[0].translatable_fields[j] == 'setValue') {
                                switch(toTranslate[0].translatable_fields[j]){
                                    case 'conditions_2':
                                        og_translation.translations[config[0].selected_languages[i]].conditions = await this.prcocessConditions(og_translation.translations[config[0].selected_languages[i]], googleTranslator);
                                        break;
                                    case 'conditions_3':
                                        // og_translation.translations[config[0].selected_languages[i]].conditions = await this.prcocessConditions(og_translation.translations[config[0].selected_languages[i]], googleTranslator);
                                        break;   
                                    case 'setValue':
                                        og_translation.translations[config[0].selected_languages[i]].setValue = await this.processSetValues(og_translation.translations[config[0].selected_languages[i]], googleTranslator);
                                        break;    
                                }
                            }
                            else {
                                (og_translation.translations[config[0].selected_languages[i]])[toTranslate[0].translatable_fields[j]] = await this.translation(googleTranslator, ((request.translations).en)[toTranslate[0].translatable_fields[j]], config[0].selected_languages[i]);
                            }
                            
                        }
                    }
                }
                data = await RuleModel.updateOne({ _id : data._id }, { ...og_translation })
                console.log(data)
                // data = await rule.save();
            }
            else {
                let language = request.lang_code;
                delete request.lang_code;
                let englishState = JSON.parse(JSON.stringify(request));
                let defaultState = JSON.parse(JSON.stringify(request));
                for (let i = 0; i < toTranslate[0].translatable_fields.length; i++) {
                    if (toTranslate[0].translatable_fields[i] == 'conditions_2' || toTranslate[0].translatable_fields[i] == 'conditions_3'|| toTranslate[0].translatable_fields[i] == 'setValue') {
                        switch(toTranslate[0].translatable_fields[i]){
                            case 'conditions_2':
                                englishState.translations[config[0].selected_languages[i]].conditions = await this.prcocessConditions(englishState.translations[config[0].selected_languages[i]], googleTranslator);
                                break;
                            case 'conditions_3':
                                // englishState.translations[config[0].selected_languages[i]].conditions = await this.prcocessConditions(englishState.translations[config[0].selected_languages[i]], googleTranslator);
                                break;   
                            case 'setValue':
                                englishState.translations[config[0].selected_languages[i]].setValue = await this.processSetValues(englishState.translations[config[0].selected_languages[i]], googleTranslator);
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
                                switch(toTranslate[0].translatable_fields[j]){
                                    case 'conditions_2':
                                        og_translation.translations[config[0].selected_languages[i]].conditions = await this.prcocessConditions(og_translation.translations[config[0].selected_languages[i]], googleTranslator);
                                        break;
                                    case 'conditions_3':
                                        // og_translation.translations[config[0].selected_languages[i]].conditions = await this.prcocessConditions(og_translation.translations[config[0].selected_languages[i]], googleTranslator);
                                        break;   
                                    case 'setValue':
                                        og_translation.translations[config[0].selected_languages[i]].setValue = await this.processSetValues(og_translation.translations[config[0].selected_languages[i]], googleTranslator);
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

        } catch(error){
            console.log(error)
        }
    }

    async prcocessConditions ( rule : any, googleTranslator : any)  {
        try {
            if(rule.conditions.any){
                for( let i = 0; i < rule.conditions.any.length; i++ ){
                    if(rule.conditions.any[i].all){
                        for( let j =0; j < rule.conditions.any[i].all.length; j++ ){
                            if((rule.conditions.any[i].all[j]).conditionalAttributeName == ""){ 
                                if((rule.conditions.any[i].all[j]).value[1] ==0 && (rule.conditions.any[i].all[j]).value[2]==0){
                                    if( ((rule.conditions.any[i].all[j]).attributeType) == 'int' || (rule.conditions.any[i].all[j]).attributeType == 'float'|| (rule.conditions.any[i].all[j]).attributeType == 'int'  ) {
                                    }else {
                                        (rule.conditions.any[i].all[j]).value[0] = await this.translation(googleTranslator,(rule.conditions.any[i].all[j]).value[0], 'en')
                                    }
                                } else {
                                    if( ((rule.conditions.any[i].all[j]).attributeType) == 'int' || (rule.conditions.any[i].all[j]).attributeType == 'float'|| (rule.conditions.any[i].all[j]).attributeType == 'int'  ) {
                                    }else {
                                        (rule.conditions.any[i].all[j]).value = await this.translation(googleTranslator,(rule.conditions.any[i].all[j]).value, 'en')
                                    }
                                }
                            } else { 
                                if((rule.conditions.any[i].all[j]).value[1] ==0 && (rule.conditions.any[i].all[j]).value[2]==0){
                                    if( ((rule.conditions.any[i].all[j]).conditionalAttributeType) == 'int' || (rule.conditions.any[i].all[j]).conditionalAttributeType == 'float'|| (rule.conditions.any[i].all[j]).conditionalAttributeType == 'int'  ) {
                                    }else {
                                    }
                                } else {
                                    if( ((rule.conditions.any[i].all[j]).attributeType) == 'int' || (rule.conditions.any[i].all[j]).attributeType == 'float'|| (rule.conditions.any[i].all[j]).attributeType == 'int'  ) {
                                    }else {
                                    }
                                }
                            }
                                // await this.dependentAttributeRepository.save({ "attributeId" : rule.conditions.any[i].all[j].attributeId, "categoryId" : rule.categoryId, "ruleId" : rule.ruleCode, "ruleType" :rule.ruleType })
    
    
                        }
                    }
                    if(rule.conditions.any[i].any){
                        for ( let k =0; k < rule.conditions.any[i].any.length; k++){
                            if((rule.conditions.any[i].any[k]).conditionalAttributeName == ""){ 
                                if((rule.conditions.any[i].any[k]).value[1] ==0 && (rule.conditions.any[i].any[k]).value[2]==0){
                                    if( ((rule.conditions.any[i].any[k]).attributeType) == 'int' || (rule.conditions.any[i].any[k]).attributeType == 'float'|| (rule.conditions.any[i].any[k]).attributeType == 'int'  ) {
                                    }else {
                                        (rule.conditions.any[i].any[k]).value[0] =  await this.translation(googleTranslator,(rule.conditions.any[i].any[k]).value[0], 'en')
                                    }
                                } else {
                                    if( ((rule.conditions.any[i].any[k]).attributeType) == 'int' || (rule.conditions.any[i].any[k]).attributeType == 'float'|| (rule.conditions.any[i].any[k]).attributeType == 'int'  ) {
                                    }else {
                                        (rule.conditions.any[i].any[k]).value =  await this.translation(googleTranslator,(rule.conditions.any[i].any[k]).value, 'en')
                                    }
                                }
                            } else { 
                                if((rule.conditions.any[i].any[k]).value[1] ==0 && (rule.conditions.any[i].any[k]).value[2]==0){
                                    if( ((rule.conditions.any[i].any[k]).conditionalAttributeType) == 'int' || (rule.conditions.any[i].any[k]).conditionalAttributeType == 'float'|| (rule.conditions.any[i].any[k]).conditionalAttributeType == 'int'  ) {
                                    }else {
                                    }
                                } else {
                                    if( ((rule.conditions.any[i].any[k]).attributeType) == 'int' || (rule.conditions.any[i].any[k]).attributeType == 'float'|| (rule.conditions.any[i].any[k]).attributeType == 'int'  ) {
                                    }else {
                                    }
                                }
                            }
                            
                        }
                    }
                    if(rule.conditions.any[i].internal){
                        for ( let l =0; l < rule.conditions.any[i].internal.length; l++){
                            if((rule.conditions.any[i].internal[l]).conditionalAttributeName == ""){ 
                                if((rule.conditions.any[i].internal[l]).value[1] ==0 && (rule.conditions.any[i].internal[l]).value[2]==0){
                                    if( ((rule.conditions.any[i].internal[l]).attributeType) == 'int' || (rule.conditions.any[i].internal[l]).attributeType == 'float'|| (rule.conditions.any[i].internal[l]).attributeType == 'int'  ) {
                                    }else {
                                        (rule.conditions.any[i].internal[l]).value[0] = await this.translation(googleTranslator,(rule.conditions.any[i].internal[l]).value[0], 'en')
                                    }
                                } else {
                                    if( ((rule.conditions.any[i].internal[l]).attributeType) == 'int' || (rule.conditions.any[i].internal[l]).attributeType == 'float'|| (rule.conditions.any[i].internal[l]).attributeType == 'int'  ) {
                                    }else {
                                        (rule.conditions.any[i].internal[l]).value = await this.translation(googleTranslator,(rule.conditions.any[i].internal[l]).value, 'en')
                                    }
                                }
                            } else { 
                                if((rule.conditions.any[i].internal[l]).value[1] ==0 && (rule.conditions.any[i].internal[l]).value[2]==0){
                                    if( ((rule.conditions.any[i].internal[l]).conditionalAttributeType) == 'int' || (rule.conditions.any[i].internal[l]).conditionalAttributeType == 'float'|| (rule.conditions.any[i].internal[l]).conditionalAttributeType == 'int'  ) {
                                    }else {                                    }
                                } else {
                                    if( ((rule.conditions.any[i].internal[l]).attributeType) == 'int' || (rule.conditions.any[i].internal[l]).attributeType == 'float'|| (rule.conditions.any[i].internal[l]).attributeType == 'int'  ) {
                                    }else {
                                    }
                                }
                            }
                        }
                    }
                }
            }
            else {
                if(rule.conditions.all) {
                    for( let i = 0; i < rule.conditions.all.length; i++ ){
                        if(rule.conditions.all[i].all){
                            for( let j =0; j < rule.conditions.all[i].all.length ; j++ ){
                                if((rule.conditions.all[i].all[j]).conditionalAttributeName == ""){ 
    
                                    if((rule.conditions.all[i].all[j]).value[1] ==0 && (rule.conditions.all[i].all[j]).value[2]==0){
                                        if( ((rule.conditions.all[i].all[j]).attributeType) == 'int' || (rule.conditions.all[i].all[j]).attributeType == 'float'|| (rule.conditions.all[i].all[j]).attributeType == 'int'  ) {
                                        }else {
                                            (rule.conditions.all[i].all[j]).value[0] = await this.translation(googleTranslator,(rule.conditions.all[i].all[j]).value[0], 'en')                                        }
                                    } else {
                                        if( ((rule.conditions.all[i].all[j]).attributeType) == 'int' || (rule.conditions.all[i].all[j]).attributeType == 'float'|| (rule.conditions.all[i].all[j]).attributeType == 'int'  ) {
                                        }
                                        else {
                                            (rule.conditions.all[i].all[j]).value = await this.translation(googleTranslator,(rule.conditions.all[i].all[j]).value, 'en')                                        
                                        }
                                    }
                                } else { 
                                    if((rule.conditions.all[i].all[j]).value[1] ==0 && (rule.conditions.all[i].all[j]).value[2]==0){
                                        if( ((rule.conditions.all[i].all[j]).conditionalAttributeType) == 'int' || (rule.conditions.all[i].all[j]).conditionalAttributeType == 'float'|| (rule.conditions.all[i].all[j]).conditionalAttributeType == 'int'  ) {                                        }else {                                        }
                                    } else {
                                        if( ((rule.conditions.all[i].all[j]).attributeType) == 'int' || (rule.conditions.all[i].all[j]).attributeType == 'float'|| (rule.conditions.all[i].all[j]).attributeType == 'int'  ) {
                                        }else {
                                        }
                                    }
                                }                                
                            }
                        }
                        if(rule.conditions.all[i].any){
                            for ( let k =0; k < rule.conditions.all[i].any.length ; k++){
                                if((rule.conditions.all[i].any[k]).conditionalAttributeName == ""){ 
                                    if((rule.conditions.all[i].any[k]).value[1] ==0 && (rule.conditions.all[i].any[k]).value[2]==0){
                                        if( ((rule.conditions.all[i].any[k]).attributeType) == 'int' || (rule.conditions.all[i].any[k]).attributeType == 'float'|| (rule.conditions.all[i].any[k]).attributeType == 'int'  ) {
                                        }else {
                                            (rule.conditions.all[i].any[k]).value[0] = await this.translation(googleTranslator,(rule.conditions.all[i].any[k]).value[0], 'en')                                        
                                        
                                        }
                                    } else {
                                        if( ((rule.conditions.all[i].any[k]).attributeType) == 'int' || (rule.conditions.all[i].any[k]).attributeType == 'float'|| (rule.conditions.all[i].any[k]).attributeType == 'int'  ) {
                                        }else {
                                            (rule.conditions.all[i].any[k]).value = await this.translation(googleTranslator,(rule.conditions.all[i].any[k]).value, 'en')                                        
                                        }
                                    }
                                } else { 
                                    if((rule.conditions.all[i].any[k]).value[1] ==0 && (rule.conditions.all[i].any[k]).value[2]==0){
                                        if( ((rule.conditions.all[i].any[k]).conditionalAttributeType) == 'int' || (rule.conditions.all[i].any[k]).conditionalAttributeType == 'float'|| (rule.conditions.all[i].any[k]).conditionalAttributeType == 'int'  ) {
                                        }else {
                                        }
                                    } else {
                                        if( ((rule.conditions.all[i].any[k]).attributeType) == 'int' || (rule.conditions.all[i].any[k]).attributeType == 'float'|| (rule.conditions.all[i].any[k]).attributeType == 'int'  ) {
                                        }else {
                                        }
                                    }
                                }
                            }
                        }
                        if(rule.conditions.all[i].internal){
                            for ( let l =0; l < rule.conditions.all[i].internal.length; l++){

                            if((rule.conditions.all[i].internal[l]).conditionalAttributeName == ""){ 
    
                                if((rule.conditions.all[i].internal[l]).value[1] ==0 && (rule.conditions.all[i].internal[l]).value[2]==0){
                                    if( ((rule.conditions.all[i].internal[l]).attributeType) == 'int' || (rule.conditions.all[i].internal[l]).attributeType == 'float'|| (rule.conditions.all[i].internal[l]).attributeType == 'int'  ) {
                                    }else {
                                       (rule.conditions.all[i].internal[l]).value[0] = await this.translation(googleTranslator, (rule.conditions.all[i].internal[l]).value[0],'en');
                                    }
                                } else {
                                    if( ((rule.conditions.all[i].internal[l]).attributeType) == 'int' || (rule.conditions.all[i].internal[l]).attributeType == 'float'|| (rule.conditions.all[i].internal[l]).attributeType == 'int'  ) {
                                     
                                    }else {
                                        (rule.conditions.all[i].internal[l]).value=await this.translation(googleTranslator,(rule.conditions.all[i].internal[l]).value, 'en')                                        ;
                                    }
                                }
                            } else { 
                                if((rule.conditions.all[i].internal[l]).value[1] ==0 && (rule.conditions.all[i].internal[l]).value[2]==0){
                                    if( ((rule.conditions.all[i].internal[l]).conditionalAttributeType) == 'int' || (rule.conditions.all[i].internal[l]).conditionalAttributeType == 'float'|| (rule.conditions.all[i].internal[l]).conditionalAttributeType == 'int'  ) {
                                    }else {
                                        
                                    }
                                } else {
                                    if( ((rule.conditions.all[i].internal[l]).attributeType) == 'int' || (rule.conditions.all[i].internal[l]).attributeType == 'float'|| (rule.conditions.all[i].internal[l]).attributeType == 'int'  ) {
                                  
                                    }else {
                                    }
                                }
                            }
                          }
                        }
                    }
            }
    
            
        }

        return rule.conditions;
        } catch(error){
            console.log(error)
        }
    }

    async processSetValues ( rule : any, googleTranslator : any ) {
        try {
            for(let i=0;i<rule.setValue.length;i++){
                if(rule.setValue.attributeType == 'varchar') {
                    rule.setValue.value = await this.translation(googleTranslator, rule.setValue.value, 'en')
                }
            }
        } catch(error) {
            console.log(error)
        }
    }


    
}
