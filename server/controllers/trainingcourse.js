const axios = require('axios')
const config = require('config');
const { Sequelize, QueryTypes } = require('sequelize');
import { camelizeKeys } from '../utils/camelizeKeys'

const getAll = async (request, h) => {
    try {
        if (!request.auth.isAuthenticated) {
            return h.response({ message: 'Forbidden', code: "xemp-1" }).code(401);
        }
        let { attributes, search, limit,mode,sortBy,sortType,recommendation } = request.query;
        if (sortBy ==="courseTitle"){
            sortBy = "course_title"
        }
        let userId = request.auth.credentials.id;
        let recommendations = await axios.get(`http://${config.dsServer.host}:${config.dsServer.port}/trainingcourse/all`, { params: { user_id: userId,attributes, search, limit, mode, sort_by:sortBy, sort_type:sortType,recommendation } });
        return h.response(camelizeKeys(recommendations.data)).code(200);
    }
    catch (error) {
        console.error(error.stack);
        if (error.response){
            return h.response(camelizeKeys(error.response.data)).code(error.response.status);
        }
        return h.response({ error: true, message: 'Bad Request' }).code(400);
    }
}

const updateStatus = async (request, h) => {
    try {
        if (!request.auth.isAuthenticated) {
            return h.response({ message: 'Forbidden', code: "xemp-1" }).code(401);
        }
        let userId = request.auth.credentials.id;
        const { courseId } = request.params || {};
        const { status } = request.payload || {};

        if (courseId && status) {
            let allowedStatuses = ["complete", "in progress", "not started"]
            if (allowedStatuses.includes(status)) {
                const { Usertrainingcourse } = request.getModels('xpaxr');
                let updatedRecord = await Usertrainingcourse.upsert({ status, userId, courseId });
                return h.response(updatedRecord).code(201);
            } else {
                return h.response({ error: true, message: `Status must be one of the following: ${allowedStatuses}` }).code(400);
            }
        } else {
            return h.response({ error: true, message: 'Course Id or status is not provided' }).code(400);
        }
    }
    catch (error) {
        console.error(error.stack);
        return h.response({ error: true, message: 'Bad Request' }).code(400);
    }
}


module.exports = {
    getAll,
    updateStatus
}