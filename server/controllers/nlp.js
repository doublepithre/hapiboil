const axios = require('axios')
const config = require('config');
import { camelizeKeys } from '../utils/camelizeKeys'

const extractSkills = async (request, h) => {
    try {
        if (!request.auth.isAuthenticated) {
            return h.response({ message: 'Forbidden', code: "xemp-1" }).code(401);
        }
        let { cleanHtml } = request.query;
        const { jobDescription } = request.payload || {};
        let skills = await axios.post(`http://${config.dsServer.host}:${config.dsServer.port}/nlp/extract_skills`, { job_description: jobDescription }, { params: { clean_html: cleanHtml } });
        return h.response(camelizeKeys(skills.data)).code(200);
    }
    catch (error) {
        console.error(error.stack);
        if (error.response){
            return h.response(camelizeKeys(error.response.data)).code(error.response.status);
        }
        return h.response({ error: true, message: 'Bad Request' }).code(400);
    }
}

const recommendSkills = async (request, h) => {
    try {
        if (!request.auth.isAuthenticated) {
            return h.response({ message: 'Forbidden', code: "xemp-1" }).code(401);
        }
        const { limit } = request.query || {};
        const { jobTitle } = request.payload || {};
        console.log(jobTitle);

        let skills = await axios.post(`http://${config.dsServer.host}:${config.dsServer.port}/nlp/job_title_skills`, { job_title: jobTitle }, { params: { limit } });
        return h.response(camelizeKeys(skills.data)).code(200);
    }
    catch (error) {
        console.error(error.stack);
        if (error.response){
            return h.response(camelizeKeys(error.response.data)).code(error.response.status);
        }
        return h.response({ error: true, message: 'Bad Request' }).code(400);
    }
}

module.exports = {
    extractSkills,
    recommendSkills,
}