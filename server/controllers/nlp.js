const axios = require('axios')
const config = require('config');
import {camelizeKeys} from '../utils/camelizeKeys'

const extractSkills = async (request, h) => {
    try {
        if (!request.auth.isAuthenticated) {
            return h.response({ message: 'Forbidden'}).code(403);
        }
        let {cleanHtml} = request.query;
        const { jobDescription } = request.payload || {};
        let skills = await axios.post(`http://${config.dsServer.host}:${config.dsServer.port}/nlp/extract_skills`,{job_description:jobDescription},{ params: { clean_html: cleanHtml } }); 
        return h.response(camelizeKeys(skills.data)).code(200);  
    }
    catch (error) {
        console.error(error.stack);
        return h.response({error: true, message: 'Bad Request'}).code(400);
    }
}

module.exports = {
    extractSkills
}