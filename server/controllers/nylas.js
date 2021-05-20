const { Op, Sequelize, QueryTypes, cast, literal } = require('sequelize');
import { camelizeKeys } from '../utils/camelizeKeys'
import { sendEmailAsync } from '../utils/email'
import formatQueryRes from '../utils/index'
import { isArray } from 'lodash';
const axios = require('axios')
const config = require('config');


const requestNyToken = async (request, h) => {
    try{
        if (!request.auth.isAuthenticated) {
            return h.response({ message: 'Forbidden'}).code(403);
        }
        
        const responses = { msg: "Hi!", body: request.payload }
        return h.response(responses).code(200);
    }
    catch (error) {
        console.error(error.stack);
        return h.response({error: true, message: 'Internal Server Error!'}).code(500);
    }
}



module.exports = {
  requestNyToken,
}