const { Op, Sequelize, QueryTypes, cast, literal } = require('sequelize');
const validator = require('validator');
import { camelizeKeys } from '../utils/camelizeKeys'
import { sendEmailAsync } from '../utils/email'
import formatQueryRes from '../utils/index'
import { isArray } from 'lodash';
const axios = require('axios')
const config = require('config');

const createCWorkAccommodationRecordsForPreviousCompanies = async (request, h) => {
    try {
        if (!request.auth.isAuthenticated) {
            return h.response({ message: 'Forbidden' }).code(403);
        }
        
        const { Workaccommodation, Company, Companyworkaccommodation } = request.getModels('xpaxr');

        const sqlStmt = `select c.company_id, cwa.company_workaccommodation_id
        from hris.company c
            left join hris.companyworkaccommodations cwa on cwa.company_id=c.company_id
        where cwa.company_id is null`;

        const db1 = request.getDb('xpaxr');
        const sequelize = db1.sequelize;
        const nullCWAcompaniesSQL = await sequelize.query(sqlStmt, {
            type: QueryTypes.SELECT,
            replacements: {},
        });
        const nullCWAcompanies = camelizeKeys(nullCWAcompaniesSQL);
        
        for (let item of nullCWAcompanies) {
            const allWorkAcoomodations = await Workaccommodation.findAll({ attributes: { exclude: ['createdAt', 'updatedAt'] } });
            for (let record of allWorkAcoomodations) {
              const defaultData = record.toJSON();
              Companyworkaccommodation.create({
                workaccommodationId: defaultData.workaccommodationId,
                companyId: item.companyId,
                status: 'not started',
              });
            };
        };

        return h.response({ message: 'Successfully created non-existing cwa records'}).code(200);
    }
    catch (error) {
        console.error(error.stack);
        return h.response({ error: true, message: 'Bad Request' }).code(400);
    }
}


module.exports = {
    createCWorkAccommodationRecordsForPreviousCompanies,
}