const { Op, Sequelize, QueryTypes, cast, literal } = require('sequelize');
const validator = require('validator');
import { camelizeKeys } from '../utils/camelizeKeys'
import { sendEmailAsync } from '../utils/email'
import formatQueryRes from '../utils/index'
import { isArray } from 'lodash';
const axios = require('axios')
const config = require('config');

const getMentorRandR = async (request, h) => {
    try {
        if (!request.auth.isAuthenticated) {
            return h.response({ message: 'Forbidden', code: "xemp-1" }).code(401);
        }
        // Checking user type from jwt
        let luserTypeName = request.auth.artifacts.decoded.userTypeName;
        if (luserTypeName !== 'supervisor' && luserTypeName !== 'workbuddy') return h.response({ error: true, message: 'You are not authorized!' }).code(403);

        const { credentials } = request.auth || {};
        const { id: userId } = credentials || {};

        const { Userinfo } = request.getModels('xpaxr');

        // get the company of the recruiter
        const userRecord = await Userinfo.findOne({ where: { userId }, attributes: { exclude: ['createdAt', 'updatedAt'] } });
        const userProfileInfo = userRecord && userRecord.toJSON();
        const { companyId: luserCompanyId } = userProfileInfo || {};

        let columnName;
        if (luserTypeName === 'supervisor') columnName = 'supervisor_rand_r'
        else if (luserTypeName === 'workbuddy') columnName = 'workbuddy_rand_r'


        const sqlStmt = `select c.${columnName}
            from hris.company c
            where c.company_id=:luserCompanyId`;

        const db1 = request.getDb('xpaxr');
        const sequelize = db1.sequelize;
        const rAndrSQL = await sequelize.query(sqlStmt, {
            type: QueryTypes.SELECT,
            replacements: {
                luserCompanyId
            },
        });
        const rAndR = camelizeKeys(rAndrSQL)[0];


        return h.response({ rolesAndResponsibilities: rAndR.supervisorRandR || rAndR.workbuddyRandR }).code(200);
    }
    catch (error) {
        console.error(error.stack);
        return h.response({ error: true, message: 'Bad Request' }).code(400);
    }
}

const mentorCandidateLinking = async (request, h) => {
    try {
        if (!request.auth.isAuthenticated) {
            return h.response({ message: 'Forbidden', code: "xemp-1" }).code(401);
        }
        // Checking user type from jwt
        let luserTypeName = request.auth.artifacts.decoded.userTypeName;
        if (luserTypeName !== 'employer') return h.response({ error: true, message: 'You are not authorized!' }).code(403);

        const { credentials } = request.auth || {};
        const { id: userId } = credentials || {};

        const { applicationId } = request.params || {};
        const { mentorId } = request.payload || {};
        if (!mentorId) return h.response({ error: true, message: 'Please provide a mentorId!' }).code(403);

        const { Userinfo, Usertype, Mentorcandidatemapping, Applicationhiremember } = request.getModels('xpaxr');

        // get the company of the recruiter
        const userRecord = await Userinfo.findOne({ where: { userId }, attributes: { exclude: ['createdAt', 'updatedAt'] } });
        const userProfileInfo = userRecord && userRecord.toJSON();
        const { companyId: luserCompanyId } = userProfileInfo || {};

        const sqlStmt = `select ja.*, j.company_id 
            from hris.jobapplications ja
                inner join hris.jobs j on j.job_id=ja.job_id
            where ja.application_id=:applicationId and j.is_deleted=false`;

        const db1 = request.getDb('xpaxr');
        const sequelize = db1.sequelize;
        const applicationJobDetailsSQL = await sequelize.query(sqlStmt, {
            type: QueryTypes.SELECT,
            replacements: {
                applicationId
            },
        });
        const applicationJobDetails = camelizeKeys(applicationJobDetailsSQL)[0];
        const { applicationId: existingApplicationId, userId: candidateId, companyId: creatorCompanyId, status } = applicationJobDetails || {};

        if (!existingApplicationId) return h.response({ error: true, message: `No application found!` }).code(400);
        if (luserCompanyId !== creatorCompanyId) return h.response({ error: true, message: `You are not authorized!` }).code(403);
        if (status !== 'hired') return h.response({ error: true, message: `The candidate is NOT hired yet!` }).code(400);

        // can (s)he update this application?
        const accessRecord = await Applicationhiremember.findOne({ where: { applicationId, userId } });
        const accessRecordInfo = accessRecord && accessRecord.toJSON();
        const { accessLevel: luserAccessLevel } = accessRecordInfo || {};

        if (luserAccessLevel !== 'jobcreator' && luserAccessLevel !== 'administrator') return h.response({ error: true, message: 'You are not authorized to update the application!' }).code(403);

        // are they really a mentor and a candidate
        const [mentorRecord, candidateRecord] = await Promise.all([
            Userinfo.findOne({
                where: { userId: mentorId },
                include: [{
                    model: Usertype,
                    as: "userType",
                    required: true,
                }]
            }),
            Userinfo.findOne({
                where: { userId: candidateId },
                include: [{
                    model: Usertype,
                    as: "userType",
                    required: true,
                }]
            })
        ]);
        const mentorProfileInfo = mentorRecord && mentorRecord.toJSON();
        const { userId: mUserId, userType: mUserType, companyId: mCompanyId } = mentorProfileInfo || {};
        const { userTypeName: mUserTypeName } = mUserType || {};

        const candidateProfileInfo = candidateRecord && candidateRecord.toJSON();
        const { userType: cUserType, companyId: cCompanyId } = candidateProfileInfo || {};
        const { userTypeName: cUserTypeName } = cUserType || {};

        if (!mUserId) return h.response({ error: true, message: 'No user found for this mentorId.' }).code(400);
        if (mUserTypeName !== 'supervisor' && mUserTypeName !== 'workbuddy') return h.response({ error: true, message: 'The user is not a supervisor/workbuddy.' }).code(400);
        if (cUserTypeName !== 'candidate') return h.response({ error: true, message: 'The user is not a candidate.' }).code(400);
        if (luserCompanyId !== mCompanyId) return h.response({ error: true, message: 'The supervisor/workbuddy is not from the same company.' }).code(400);

        // is already linked
        const alreadyLinkedRecord = await Mentorcandidatemapping.findOne({ where: { candidateId } });
        const alreadyLinkedInfo = alreadyLinkedRecord && alreadyLinkedRecord.toJSON();
        const { mentorcandidatemappingId } = alreadyLinkedInfo || {};

        if (mentorcandidatemappingId) return h.response({ error: true, message: 'Already has a supervisor/workbuddy!' }).code(400);

        const record = await Mentorcandidatemapping.create({
            mentorId,
            candidateId
        });
        await Applicationhiremember.destroy({ where: { userId: mentorId, applicationId } })

        return h.response(record).code(200);
    }
    catch (error) {
        console.error(error.stack);
        return h.response({ error: true, message: 'Bad Request' }).code(400);
    }
}

const getMentorCandidates = async (request, h) => {
    try {
        if (!request.auth.isAuthenticated) {
            return h.response({ message: 'Forbidden', code: "xemp-1" }).code(401);
        }
        const { credentials } = request.auth || {};
        const { id: userId } = credentials || {};
        // Checking user type from jwt
        let luserTypeName = request.auth.artifacts.decoded.userTypeName;
        if (luserTypeName !== 'supervisor' && luserTypeName !== 'workbuddy') {
            return h.response({ error: true, message: 'You are not authorized!' }).code(403);
        }
        const mentorId = userId;
        const { search, sort } = request.query || {};
        const searchVal = `%${search ? search.toLowerCase() : ''}%`;

        // sort query
        let [sortBy, sortType] = sort ? sort.split(':') : ['first_name', 'asc'];
        if (!sortType && sortBy !== 'created_at') sortType = 'asc';
        if (!sortType && sortBy === 'created_at') sortType = 'desc';

        const validSorts = ['first_name', 'last_name', 'created_at'];
        const isSortReqValid = validSorts.includes(sortBy);

        const validSortTypes = ['asc', 'desc'];
        const isSortTypeReqValid = validSortTypes.includes(sortType.toLowerCase());

        // query validation
        if (!sortBy || !isSortReqValid) return h.response({ error: true, message: 'Invalid sort query parameter!' }).code(400);
        if (!isSortTypeReqValid) return h.response({ error: true, message: 'Invalid sort query parameter! Sort type is invalid, it should be either "asc" or "desc"!' }).code(400);

        const { Userinfo } = request.getModels('xpaxr');
        // get the company of the luser
        const userRecord = await Userinfo.findOne({ where: { userId: mentorId }, attributes: { exclude: ['createdAt', 'updatedAt'] } });
        const userProfileInfo = userRecord && userRecord.toJSON();
        const { companyId: luserCompanyId } = userProfileInfo || {};

        // find all candidates' records (using SQL to avoid nested ugliness in the response)
        const db1 = request.getDb('xpaxr');
        let sqlStmt = `select
          mcm.mentorcandidatemapping_id, mcm.mentor_id, ja.job_id,
          ut.user_type_name, ur.role_name, ui.*
      from hris.mentorcandidatemapping mcm
          inner join hris.userinfo ui on ui.user_id=mcm.candidate_id
          inner join hris.jobapplications ja on ja.user_id=mcm.candidate_id and ja.status='hired'
          inner join hris.jobs j on j.job_id=ja.job_id and j.company_id=:luserCompanyId
          inner join hris.usertype ut on ut.user_type_id=ui.user_type_id
          inner join hris.userrole ur on ur.role_id=ui.role_id
      where mcm.mentor_id=:mentorId`;

        if (searchVal) {
            sqlStmt += ` and (
              ui.first_name ilike :searchVal
              or ui.last_name ilike :searchVal
              or ui.email ilike :searchVal
          )`;
        }
        // order and sort
        if (sortBy === 'created_at') {
            sqlStmt += ` order by mcm.${sortBy} ${sortType}`;

        } else {
            sqlStmt += ` order by ui.${sortBy} ${sortType}`;

        }

        const sequelize = db1.sequelize;
        const allCandidateInfoSQL = await sequelize.query(sqlStmt, {
            type: QueryTypes.SELECT,
            replacements: {
                mentorId, luserCompanyId, searchVal
            },
        });
        const allCandidateInfo = camelizeKeys(allCandidateInfoSQL);
        return h.response({ candidates: allCandidateInfo }).code(200);
    }
    catch (error) {
        console.error(error.stack);
        return h.response({ error: true, message: 'Bad Request' }).code(400);
    }
}

const getAllMentorCandidates = async (request, h) => {
    try {
        if (!request.auth.isAuthenticated) {
            return h.response({ message: 'Forbidden', code: "xemp-1" }).code(401);
        }
        const { credentials } = request.auth || {};
        const { id: userId } = credentials || {};
        // Checking user type from jwt
        let luserTypeName = request.auth.artifacts.decoded.userTypeName;
        if (luserTypeName !== 'companysuperadmin') return h.response({ error: true, message: 'You are not authorized!' }).code(403);

        const { Userinfo, Mentorcandidatemapping } = request.getModels('xpaxr');

        // get the company of the luser
        const luserRecord = await Userinfo.findOne({ where: { userId }, attributes: { exclude: ['createdAt', 'updatedAt'] } });
        const luserProfileInfo = luserRecord && luserRecord.toJSON();
        const { companyId: luserCompanyId } = luserProfileInfo || {};

        const allMentorsRaw = await Userinfo.findAll({
            where: { userTypeId: 3, companyId: luserCompanyId },
            include: [{
                model: Mentorcandidatemapping,
                as: 'mentorMentorcandidatemappings',
                required: true,
                attributes: ['mentorcandidatemappingId', 'mentorId', 'candidateId'],

                include: {
                    model: Userinfo,
                    as: 'candidate',
                    required: true,
                    attributes: ['userId', 'email', 'firstName'],
                }
            }],
            attributes: ['userId', 'email', 'firstName'],

        })


        const allMentors = [];
        for (let i = 0; i < allMentorsRaw.length; i++) {
            const mentorRecord = allMentorsRaw[i] && allMentorsRaw[i].toJSON();
            const { mentorMentorcandidatemappings: mcmappings } = mentorRecord || {};
            const allCandidates = [];

            for (let j = 0; j < mcmappings.length; j++) {
                const { candidate } = mcmappings[j] || {};
                allCandidates.push(candidate);
            }

            mentorRecord.candidates = allCandidates;
            delete mentorRecord.mentorMentorcandidatemappings;
            allMentors.push(mentorRecord);
        }

        return h.response({ mentors: allMentors }).code(200);
    }
    catch (error) {
        console.error(error.stack);
        return h.response({ error: true, message: 'Bad Request' }).code(400);
    }
}

const replaceMentorForOne = async (request, h) => {
    try {
        if (!request.auth.isAuthenticated) {
            return h.response({ message: 'Forbidden', code: "xemp-1" }).code(401);
        }
        // Checking user type from jwt
        let luserTypeName = request.auth.artifacts.decoded.userTypeName;
        if (luserTypeName !== 'companysuperadmin') return h.response({ error: true, message: 'You are not authorized!' }).code(403);

        const { credentials } = request.auth || {};
        const { id: userId } = credentials || {};

        const { candidateId } = request.params || {};
        const { mentorId } = request.payload || {};
        if (!mentorId) return h.response({ error: true, message: 'Please provide a mentorId!' }).code(403);

        const { Userinfo, Usertype, Mentorcandidatemapping } = request.getModels('xpaxr');

        // get the company of the luser
        const userRecord = await Userinfo.findOne({ where: { userId }, attributes: { exclude: ['createdAt', 'updatedAt'] } });
        const userProfileInfo = userRecord && userRecord.toJSON();
        const { companyId: luserCompanyId } = userProfileInfo || {};

        // are they really a mentor and a candidate
        const [mentorRecord, candidateRecord] = await Promise.all([
            Userinfo.findOne({
                where: { userId: mentorId },
                include: [{
                    model: Usertype,
                    as: "userType",
                    required: true,
                }]
            }),
            Userinfo.findOne({
                where: { userId: candidateId },
                include: [{
                    model: Usertype,
                    as: "userType",
                    required: true,
                }]
            })
        ]);
        const mentorProfileInfo = mentorRecord && mentorRecord.toJSON();
        const { userId: mUserId, userType: mUserType, companyId: mCompanyId } = mentorProfileInfo || {};
        const { userTypeName: mUserTypeName } = mUserType || {};

        const candidateProfileInfo = candidateRecord && candidateRecord.toJSON();
        const { userType: cUserType } = candidateProfileInfo || {};
        const { userTypeName: cUserTypeName } = cUserType || {};

        if (!mUserId) return h.response({ error: true, message: 'No user found for this mentorId.' }).code(400);
        if (mUserTypeName !== 'supervisor' && mUserTypeName !== 'workbuddy') return h.response({ error: true, message: 'The user is not a supervisor/workbuddy.' }).code(400);
        if (cUserTypeName !== 'candidate') return h.response({ error: true, message: 'The user is not a candidate.' }).code(400);
        if (luserCompanyId !== mCompanyId) return h.response({ error: true, message: 'The supervisor/workbuddy is not from the same company.' }).code(400);

        // is already linked
        const alreadyLinkedRecord = await Mentorcandidatemapping.findOne({ where: { candidateId, mentorId } });
        const alreadyLinkedInfo = alreadyLinkedRecord && alreadyLinkedRecord.toJSON();
        const { mentorcandidatemappingId } = alreadyLinkedInfo || {};

        if (mentorcandidatemappingId) return h.response({ error: true, message: 'This supervisor/workbuddy is already mentoring this candidate!' }).code(400);

        await Mentorcandidatemapping.update({ mentorId }, { where: { candidateId } });
        return h.response({ message: `Mentor replacing successful!` }).code(200);
    }
    catch (error) {
        console.error(error.stack);
        return h.response({ error: true, message: 'Bad Request' }).code(400);
    }
}

const replaceMentorForAll = async (request, h) => {
    try {
        if (!request.auth.isAuthenticated) {
            return h.response({ message: 'Forbidden', code: "xemp-1" }).code(401);
        }
        // Checking user type from jwt
        let luserTypeName = request.auth.artifacts.decoded.userTypeName;
        if (luserTypeName !== 'companysuperadmin') return h.response({ error: true, message: 'You are not authorized!' }).code(403);

        const { credentials } = request.auth || {};
        const { id: userId } = credentials || {};

        const { oldMentorId } = request.params || {};
        const { mentorId: newMentorId } = request.payload || {};
        if (!newMentorId) return h.response({ error: true, message: 'Please provide a mentorId!' }).code(400);
        if (oldMentorId === newMentorId) return h.response({ error: true, message: 'Both the old mentor and the new mentor is the same person!' }).code(400);

        const { Userinfo, Usertype } = request.getModels('xpaxr');

        // get the company of the luser
        const userRecord = await Userinfo.findOne({ where: { userId }, attributes: { exclude: ['createdAt', 'updatedAt'] } });
        const userProfileInfo = userRecord && userRecord.toJSON();
        const { companyId: luserCompanyId } = userProfileInfo || {};

        // is (s)he really a mentor
        const [newMentorRecord, oldMentorRecord] = await Promise.all([
            Userinfo.findOne({
                where: { userId: newMentorId },
                include: [{
                    model: Usertype,
                    as: "userType",
                    required: true,
                }]
            }),
            Userinfo.findOne({
                where: { userId: oldMentorId },
                include: [{
                    model: Usertype,
                    as: "userType",
                    required: true,
                }]
            })
        ]);
        const newMentorProfileInfo = newMentorRecord && newMentorRecord.toJSON();
        const { userId: nmUserId, userType: nmUserType, companyId: nmCompanyId } = newMentorProfileInfo || {};
        const { userTypeName: nmUserTypeName } = nmUserType || {};

        const oldMentorProfileInfo = oldMentorRecord && oldMentorRecord.toJSON();
        const { companyId: omCompanyId } = oldMentorProfileInfo || {};

        if (luserCompanyId !== omCompanyId) return h.response({ error: true, message: 'The old mentor is not from the same company.' }).code(400);

        if (!nmUserId) return h.response({ error: true, message: 'No user found for this mentorId.' }).code(400);
        if (nmUserTypeName !== 'supervisor' && nmUserTypeName !== 'workbuddy') return h.response({ error: true, message: 'The user is not a supervisor/workbuddy.' }).code(400);
        if (luserCompanyId !== nmCompanyId) return h.response({ error: true, message: 'The replacer supervisor/workbuddy is not from the same company.' }).code(400);

        const sqlStmt = `
            UPDATE hris.mentorcandidatemapping mcm
            SET mentor_id = :newMentorId
            where mcm.mentor_id=:oldMentorId`;

        const db1 = request.getDb('xpaxr');
        const sequelize = db1.sequelize;
        await sequelize.query(sqlStmt, {
            type: QueryTypes.SELECT,
            replacements: { newMentorId, oldMentorId },
        });

        return h.response({ message: `Mentor replacing successful!` }).code(200);
    }
    catch (error) {
        console.error(error.stack);
        return h.response({ error: true, message: 'Bad Request' }).code(400);
    }
}

const deleteMentorCandidateMappingRecord = async (request, h) => {
    try {
        if (!request.auth.isAuthenticated) {
            return h.response({ message: 'Forbidden', code: "xemp-1" }).code(401);
        }
        // Checking user type from jwt
        let luserTypeName = request.auth.artifacts.decoded.userTypeName;
        if (luserTypeName !== 'companysuperadmin') return h.response({ error: true, message: 'You are not authorized!' }).code(403);

        const { credentials } = request.auth || {};
        const { id: userId } = credentials || {};

        const { candidateId } = request.params || {};

        const { Userinfo, Mentorcandidatemapping } = request.getModels('xpaxr');

        // get the company of the luser
        const userRecord = await Userinfo.findOne({ where: { userId }, attributes: { exclude: ['createdAt', 'updatedAt'] } });
        const userProfileInfo = userRecord && userRecord.toJSON();
        const { companyId: luserCompanyId } = userProfileInfo || {};

        // is already linked
        const alreadyLinkedRecord = await Mentorcandidatemapping.findOne({ where: { candidateId } });
        const alreadyLinkedInfo = alreadyLinkedRecord && alreadyLinkedRecord.toJSON();
        const { mentorcandidatemappingId, mentorId } = alreadyLinkedInfo || {};

        if (!mentorcandidatemappingId) return h.response({ error: true, message: `This candidate doesn't have a mentor!` }).code(400);

        // is the mentor from same company
        const mentorRecord = await Userinfo.findOne({ where: { userId: mentorId } });
        const mentorProfileInfo = mentorRecord && mentorRecord.toJSON();
        const { userId: mUserId, companyId: mCompanyId } = mentorProfileInfo || {};

        if (!mUserId) return h.response({ error: true, message: 'No user found for this mentorId.' }).code(400);
        if (luserCompanyId !== mCompanyId) return h.response({ error: true, message: 'The mentor is not from the same company.' }).code(400);

        await Mentorcandidatemapping.destroy({ where: { candidateId, mentorId } });

        return h.response({ message: `Record deletion successful!` }).code(200);
    }
    catch (error) {
        console.error(error.stack);
        return h.response({ error: true, message: 'Bad Request' }).code(400);
    }
}

const getMentorApplicantProfile = async (request, h) => {
    try {
        if (!request.auth.isAuthenticated) {
            return h.response({ message: 'Forbidden', code: "xemp-1" }).code(401);
        }
        // Checking user type from jwt
        let luserTypeName = request.auth.artifacts.decoded.userTypeName;
        if (luserTypeName !== 'supervisor' && luserTypeName !== 'workbuddy') {
            return h.response({ error: true, message: 'You are not authorized!' }).code(403);
        }

        const { credentials } = request.auth || {};
        const { id: luserId } = credentials || {};

        const { jobId: rParamsJobId, userId } = request.params || {};
        const { Userinfo, Job, Applicationhiremember } = request.getModels('xpaxr');

        // get the company of the recruiter
        const luserRecord = await Userinfo.findOne({ where: { userId: luserId }, attributes: { exclude: ['createdAt', 'updatedAt'] } });
        const luserProfileInfo = luserRecord && luserRecord.toJSON();
        const { companyId: luserCompanyId } = luserProfileInfo || {};

        const existingJobRecord = await Job.findOne({ where: { jobId: rParamsJobId, isDeleted: false } });
        const existingJobInfo = existingJobRecord && existingJobRecord.toJSON();
        const { jobId } = existingJobInfo || {};

        if (!jobId) return h.response({ error: true, message: `No job found!` }).code(400);

        // get the applicant's profile
        const db1 = request.getDb('xpaxr');
        const sqlStmt = `select
            ja.application_id, ja.status, ja.created_at as application_date, mcm.mentor_id,
            j.company_id as job_creator_company_id, jn.job_name,
            j.job_uuid, j.*, jt.job_type_name, jf.job_function_name,ji.job_industry_name,jl.job_location_name,
            ui.*, ut.user_type_name, ur.role_name
        from hris.userinfo ui
            inner join hris.usertype ut on ut.user_type_id=ui.user_type_id
            inner join hris.userrole ur on ur.role_id=ui.role_id
            inner join hris.jobapplications ja on ja.user_id=ui.user_id
            
            inner join hris.jobs j on j.job_id=:jobId
            inner join hris.jobname jn on jn.job_name_id=j.job_name_id
            inner join hris.jobtype jt on jt.job_type_id=j.job_type_id                
            inner join hris.jobfunction jf on jf.job_function_id=j.job_function_id                
            inner join hris.jobindustry ji on ji.job_industry_id=j.job_industry_id
            inner join hris.joblocation jl on jl.job_location_id=j.job_location_id
            
            left join hris.mentorcandidatemapping mcm on mcm.candidate_id=ui.user_id
        where ui.user_id=:userId and ja.job_id=:jobId`;

        const sequelize = db1.sequelize;
        const userinfoSQL = await sequelize.query(sqlStmt, {
            type: QueryTypes.SELECT,
            replacements: {
                jobId, userId,
            },
        });
        const applicantInfo = camelizeKeys(userinfoSQL)[0];
        const { userId: auserId, applicationId, jobCreatorCompanyId } = applicantInfo || {};
        if (!auserId) return h.response({ error: true, message: 'No applicant found!' }).code(400);

        if (luserCompanyId !== jobCreatorCompanyId) return h.response({ error: true, message: 'You are not authorized!' }).code(403);
        delete applicantInfo.jobCreatorCompanyId;

        return h.response(applicantInfo).code(200);
    }
    catch (error) {
        console.error(error.stack);
        return h.response({ error: true, message: 'Bad Request!' }).code(500);
    }
}

const getAllMentorApplicantsSelectiveProfile = async (request, h) => {
    try {
        if (!request.auth.isAuthenticated) {
            return h.response({ message: 'Forbidden', code: "xemp-1" }).code(401);
        }
        const { credentials } = request.auth || {};
        const { id: userId } = credentials || {};
        // Checking user type from jwt
        let luserTypeName = request.auth.artifacts.decoded.userTypeName;
        if (luserTypeName !== 'supervisor' && luserTypeName !== 'workbuddy') {
            return h.response({ error: true, message: 'You are not authorized!' }).code(403);
        }

        const { Job } = request.getModels('xpaxr');


        const { limit, offset, sort, startDate, endDate, search, status } = request.query;
        const searchVal = `%${search ? search.toLowerCase() : ''}%`;

        // Checking if application status is valid
        const validStatus = ['applied', 'shortlisted', 'interview', 'closed', 'offer', 'hired'];
        const isStatusReqValid = (status && isArray(status)) ? (
            status.every(req => validStatus.includes(req))
        ) : validStatus.includes(status);
        if (status && !isStatusReqValid) return h.response({ error: true, message: 'Invalid status query parameter!' }).code(400);

        // sort query
        let [sortBy, sortType] = sort ? sort.split(':') : ['application_date', 'desc'];
        if (!sortType && sortBy !== 'application_date') sortType = 'asc';
        if (!sortType && sortBy === 'application_date') sortType = 'desc';

        const validSorts = ['first_name', 'last_name', 'application_date', 'status'];
        const isSortReqValid = validSorts.includes(sortBy);

        const validSortTypes = ['asc', 'desc'];
        const isSortTypeReqValid = validSortTypes.includes(sortType.toLowerCase());

        // pagination
        const limitNum = limit ? Number(limit) : 10;
        const offsetNum = offset ? Number(offset) : 0;

        //   query validation
        if (isNaN(limitNum)) return h.response({ error: true, message: 'Invalid limit query parameter! The limit query parameter must be a number!' }).code(400);
        if (isNaN(offsetNum)) return h.response({ error: true, message: 'Invalid offset query parameter! The offset query parameter must be a number!' }).code(400);
        if (!sortBy || !isSortReqValid) return h.response({ error: true, message: 'Invalid sort query parameter!' }).code(400);
        if (!isSortTypeReqValid) return h.response({ error: true, message: 'Invalid sort query parameter! Sort type is invalid, it should be either "asc" or "desc"!' }).code(400);

        if (limitNum < 0) return h.response({ error: true, message: 'Limit must be greater than 0!' }).code(400);
        if (limitNum > 100) return h.response({ error: true, message: 'Limit must not exceed 100!' }).code(400);

        // custom date search query
        let lowerDateRange;
        let upperDateRange;
        if (!startDate && endDate) return h.response({ error: true, message: `You can't send endDate without startDate!` }).code(400);

        if (startDate) {
            if (startDate && !endDate) {
                lowerDateRange = new Date(startDate);
                upperDateRange = new Date(); //Now()
            }
            if (startDate && endDate) {
                lowerDateRange = new Date(startDate);
                upperDateRange = new Date(endDate);
            }

            const isValidDate = !isNaN(Date.parse(lowerDateRange)) && !isNaN(Date.parse(upperDateRange));
            if (!isValidDate) return h.response({ error: true, message: 'Invalid startDate or endDate query parameter!' }).code(400);
            const isValidDateRange = lowerDateRange.getTime() < upperDateRange.getTime();
            if (!isValidDateRange) return h.response({ error: true, message: 'endDate must be after startDate!' }).code(400);
        }

        const db1 = request.getDb('xpaxr');
        // get sql statement for getting all applications or all applications' count        
        const filters = { startDate, status, search, sortBy, sortType }
        function getSqlStmt(queryType, obj = filters) {
            const { startDate, status, search, sortBy, sortType } = obj;
            let sqlStmt;
            const type = queryType && queryType.toLowerCase();
            if (type === 'count') {
                sqlStmt = `select count(*)`;
            } else {
                sqlStmt = `select ja.*, ja.created_at as application_date, ui.*`;
            }

            sqlStmt += `
                from hris.jobapplications ja
                    inner join hris.applicationhiremember ahm on ahm.application_id=ja.application_id
                    inner join hris.userinfo ui on ui.user_id=ja.user_id                    
                where ja.is_withdrawn=false 
                    and ahm.access_level='viewer'
                    and ahm.user_id=:userId`;

            if (startDate) sqlStmt += ` and ja.created_at >= :lowerDateRange and ja.created_at <= :upperDateRange`;
            // filters
            if (status) {
                sqlStmt += isArray(status) ? ` and ja.status in (:status)` : ` and ja.status=:status`;
            }
            // search
            if (search) {
                sqlStmt += ` and (
                    ui.first_name ilike :searchVal
                    or ui.last_name ilike :searchVal                    
                )`;
            }

            if (type !== 'count') {
                // sorts
                if (sortBy === 'application_date') {
                    sqlStmt += ` order by ja.created_at ${sortType}`;
                } else {
                    sqlStmt += ` order by ${sortBy} ${sortType}`;
                }

                // limit and offset
                sqlStmt += ` limit :limitNum  offset :offsetNum`
            };

            return sqlStmt;
        }

        const sequelize = db1.sequelize;
        const allSQLApplications = await sequelize.query(getSqlStmt(), {
            type: QueryTypes.SELECT,
            replacements: {
                userId,
                limitNum, offsetNum,
                searchVal,
                status,
                lowerDateRange, upperDateRange,
            },
        });
        const allSQLApplicationsCount = await sequelize.query(getSqlStmt('count'), {
            type: QueryTypes.SELECT,
            replacements: {
                userId,
                limitNum, offsetNum,
                searchVal,
                status,
                lowerDateRange, upperDateRange,
            },
        });
        const allApplicantions = camelizeKeys(allSQLApplications);

        const paginatedResponse = { count: allSQLApplicationsCount[0].count, applications: allApplicantions };
        return h.response(paginatedResponse).code(200);
    }
    catch (error) {
        console.error(error.stack);
        return h.response({ error: true, message: 'Bad Request!' }).code(500);
    }
}

module.exports = {
    getMentorRandR,

    mentorCandidateLinking,
    getMentorCandidates,
    getAllMentorCandidates,

    replaceMentorForOne,
    replaceMentorForAll,
    deleteMentorCandidateMappingRecord,

    getMentorApplicantProfile,
    getAllMentorApplicantsSelectiveProfile,
}