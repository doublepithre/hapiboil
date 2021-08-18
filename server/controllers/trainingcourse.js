const axios = require('axios')
const config = require('config');
const { Sequelize, QueryTypes } = require('sequelize');
import {camelizeKeys} from '../utils/camelizeKeys'

const getRecommendation = async (request, h) => {
    try {
        if (!request.auth.isAuthenticated) {
            return h.response({ message: 'Forbidden'}).code(403);
        }
        let userId = request.auth.credentials.id;
        let {limit} = request.query;
        let recommendations = await axios.get(`http://${config.dsServer.host}:${config.dsServer.port}/trainingcourse/recommendation`,{ params: { user_id: userId,limit } });
        return h.response(camelizeKeys(recommendations.data)).code(200);  
    }
    catch (error) {
        console.error(error.stack);
        return h.response({error: true, message: 'Bad Request'}).code(400);
    }
}

const getAll= async (request, h) => {
    try {
        if (!request.auth.isAuthenticated) {
            return h.response({ message: 'Forbidden'}).code(403);
        }
        let {attributes,search,limit} = request.query;
        let recommendations = await axios.get(`http://${config.dsServer.host}:${config.dsServer.port}/trainingcourse/all`,{ params: { attributes,search,limit}});
        return h.response(camelizeKeys(recommendations.data)).code(200);  
    }
    catch (error) {
        console.error(error.stack);
        return h.response({error: true, message: 'Bad Request'}).code(400);
    }
}


module.exports = {
    getRecommendation,
    getAll
}