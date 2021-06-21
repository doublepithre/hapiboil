const { Op, Sequelize, QueryTypes, cast, literal } = require('sequelize');
const validator = require('validator');
import { camelizeKeys } from '../utils/camelizeKeys'
import { sendEmailAsync } from '../utils/email'
import formatQueryRes from '../utils/index'
import { isArray } from 'lodash';
const axios = require('axios')
const config = require('config');

const mentorCandidateLinking = async (request, h) => {
    try{
        if (!request.auth.isAuthenticated) {
            return h.response({ message: 'Forbidden'}).code(403);
        }
        // Checking user type from jwt
        let luserTypeName = request.auth.artifacts.decoded.userTypeName;   
        if(luserTypeName !== 'employer') return h.response({error:true, message:'You are not authorized!'}).code(403);
        
        const { credentials } = request.auth || {};
        const { id: userId } = credentials || {};
        
        const { applicationId } = request.params || {};
        const { mentorId } = request.payload || {};
        if(!mentorId) return h.response({error:true, message:'Please provide a mentorId!'}).code(403);
                
        const { Userinfo, Usertype, Mentorcandidatemapping, Applicationhiremember } = request.getModels('xpaxr');

        // get the company of the recruiter
        const userRecord = await Userinfo.findOne({ where: { userId }, attributes: { exclude: ['createdAt', 'updatedAt'] }});
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

        if(!existingApplicationId) return h.response({error: true, message: `No application found!`}).code(400);
        if(luserCompanyId !== creatorCompanyId) return h.response({error: true, message: `You are not authorized!`}).code(403);
        if(status !== 'hired') return h.response({error: true, message: `The candidate is NOT hired yet!`}).code(400);

        // can (s)he update this application?
        const accessRecord = await Applicationhiremember.findOne({ where: { applicationId, userId }});
        const accessRecordInfo = accessRecord && accessRecord.toJSON();
        const { accessLevel: luserAccessLevel } = accessRecordInfo || {};
 
        if(luserAccessLevel !== 'jobcreator' && luserAccessLevel !== 'administrator') return h.response({ error: true, message: 'You are not authorized to update the application!'}).code(403);         
        
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

        if(!mUserId) return h.response({error: true, message: 'No user found for this mentorId.'}).code(400);
        if(mUserTypeName !== 'mentor') return h.response({error: true, message: 'The user is not a mentor.'}).code(400);
        if(cUserTypeName !== 'candidate') return h.response({error: true, message: 'The user is not a candidate.'}).code(400);
        if(luserCompanyId !== mCompanyId) return h.response({error: true, message: 'The mentor is not from the same company.'}).code(400);

        // is already linked
        const alreadyLinkedRecord = await Mentorcandidatemapping.findOne({ where: { candidateId }});
        const alreadyLinkedInfo = alreadyLinkedRecord && alreadyLinkedRecord.toJSON();
        const { mentorcandidatemappingId } = alreadyLinkedInfo || {};

        if(mentorcandidatemappingId) return h.response({ error: true, message: 'Already has a mentor!'}).code(400);

        const record = await Mentorcandidatemapping.create({
            mentorId,
            candidateId
        });
        await Applicationhiremember.destroy({ where:{ userId: mentorId, applicationId }})

        return h.response(record).code(200);
    }
    catch (error) {
        console.error(error.stack);
        return h.response({error: true, message: 'Bad Request'}).code(400);
    }
}

const getMentorCandidates = async (request, h) => {
  try {
      if (!request.auth.isAuthenticated) {
          return h.response({ message: 'Forbidden'}).code(403);
      }
      const { credentials } = request.auth || {};
      const { id: userId } = credentials || {};        
      // Checking user type from jwt
      let luserTypeName = request.auth.artifacts.decoded.userTypeName;
      if(luserTypeName !== 'mentor'){
          return h.response({error:true, message:'You are not authorized!'}).code(403);
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

      const validSortTypes = [ 'asc', 'desc'];
      const isSortTypeReqValid = validSortTypes.includes(sortType.toLowerCase());

      // query validation
      if(!sortBy || !isSortReqValid) return h.response({error: true, message: 'Invalid sort query parameter!'}).code(400);
      if(!isSortTypeReqValid) return h.response({error: true, message: 'Invalid sort query parameter! Sort type is invalid, it should be either "asc" or "desc"!'}).code(400);
                        
      const { Userinfo } = request.getModels('xpaxr');
      // get the company of the luser
      const userRecord = await Userinfo.findOne({ where: { userId: mentorId }, attributes: { exclude: ['createdAt', 'updatedAt'] }});
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

      if(searchVal) {
          sqlStmt += ` and (
              ui.first_name ilike :searchVal
              or ui.last_name ilike :searchVal
              or ui.email ilike :searchVal
          )`;
      }
      // order and sort
      if(sortBy === 'created_at') {
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
      return h.response({error: true, message: 'Bad Request'}).code(400);
  }
}

const getAllMentorCandidates = async (request, h) => {
  try {
      if (!request.auth.isAuthenticated) {
          return h.response({ message: 'Forbidden'}).code(403);
      }
      const { credentials } = request.auth || {};
      const { id: userId } = credentials || {};        
      // Checking user type from jwt
      let luserTypeName = request.auth.artifacts.decoded.userTypeName;
      if(luserTypeName !== 'companysuperadmin') return h.response({error:true, message:'You are not authorized!'}).code(403);
            
      const { Userinfo, Mentorcandidatemapping } = request.getModels('xpaxr');

      // get the company of the luser
      const luserRecord = await Userinfo.findOne({ where: { userId }, attributes: { exclude: ['createdAt', 'updatedAt'] }});
      const luserProfileInfo = luserRecord && luserRecord.toJSON();
      const { companyId: luserCompanyId } = luserProfileInfo || {};

      const allMentorsRaw = await Userinfo.findAll({
          where: { userTypeId: 3, companyId: luserCompanyId},
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
      for(let i=0; i<allMentorsRaw.length; i++){
          const mentorRecord = allMentorsRaw[i] && allMentorsRaw[i].toJSON();
          const { mentorMentorcandidatemappings: mcmappings } = mentorRecord || {};
          const allCandidates = [];
          
          for(let j=0; j<mcmappings.length; j++){
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
      return h.response({error: true, message: 'Bad Request'}).code(400);
  }
}

const replaceMentorForOne = async (request, h) => {
    try{
        if (!request.auth.isAuthenticated) {
            return h.response({ message: 'Forbidden'}).code(403);
        }
        // Checking user type from jwt
        let luserTypeName = request.auth.artifacts.decoded.userTypeName;   
        if(luserTypeName !== 'companysuperadmin') return h.response({error:true, message:'You are not authorized!'}).code(403);
        
        const { credentials } = request.auth || {};
        const { id: userId } = credentials || {};
        
        const { candidateId } = request.params || {};
        const { mentorId } = request.payload || {};
        if(!mentorId) return h.response({error:true, message:'Please provide a mentorId!'}).code(403);
                
        const { Userinfo, Usertype, Mentorcandidatemapping } = request.getModels('xpaxr');

        // get the company of the luser
        const userRecord = await Userinfo.findOne({ where: { userId }, attributes: { exclude: ['createdAt', 'updatedAt'] }});
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

        if(!mUserId) return h.response({error: true, message: 'No user found for this mentorId.'}).code(400);
        if(mUserTypeName !== 'mentor') return h.response({error: true, message: 'The user is not a mentor.'}).code(400);
        if(cUserTypeName !== 'candidate') return h.response({error: true, message: 'The user is not a candidate.'}).code(400);
        if(luserCompanyId !== mCompanyId) return h.response({error: true, message: 'The mentor is not from the same company.'}).code(400);

        // is already linked
        const alreadyLinkedRecord = await Mentorcandidatemapping.findOne({ where: { candidateId, mentorId }});
        const alreadyLinkedInfo = alreadyLinkedRecord && alreadyLinkedRecord.toJSON();
        const { mentorcandidatemappingId } = alreadyLinkedInfo || {};

        if(mentorcandidatemappingId) return h.response({ error: true, message: 'This mentor is already mentoring this candidate!'}).code(400);

        await Mentorcandidatemapping.update({ mentorId }, { where: { candidateId } });
        return h.response({ message: `Mentor replacing successful!`}).code(200);
    }
    catch (error) {
        console.error(error.stack);
        return h.response({error: true, message: 'Bad Request'}).code(400);
    }
}

const replaceMentorForAll = async (request, h) => {
    try{
        if (!request.auth.isAuthenticated) {
            return h.response({ message: 'Forbidden'}).code(403);
        }
        // Checking user type from jwt
        let luserTypeName = request.auth.artifacts.decoded.userTypeName;   
        if(luserTypeName !== 'companysuperadmin') return h.response({error:true, message:'You are not authorized!'}).code(403);
        
        const { credentials } = request.auth || {};
        const { id: userId } = credentials || {};
        
        const { oldMentorId } = request.params || {};        
        const { mentorId: newMentorId } = request.payload || {};        
        if(!newMentorId) return h.response({error:true, message:'Please provide a mentorId!'}).code(400);
        if(oldMentorId === newMentorId) return h.response({error:true, message:'Both the old mentor and the new mentor is the same person!'}).code(400);
                
        const { Userinfo, Usertype } = request.getModels('xpaxr');

        // get the company of the luser
        const userRecord = await Userinfo.findOne({ where: { userId }, attributes: { exclude: ['createdAt', 'updatedAt'] }});
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
                
        if(luserCompanyId !== omCompanyId) return h.response({error: true, message: 'The old mentor is not from the same company.'}).code(400);
        
        if(!nmUserId) return h.response({error: true, message: 'No user found for this mentorId.'}).code(400);
        if(nmUserTypeName !== 'mentor') return h.response({error: true, message: 'The user is not a mentor.'}).code(400);
        if(luserCompanyId !== nmCompanyId) return h.response({error: true, message: 'The replacer mentor is not from the same company.'}).code(400);
        
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
               
        return h.response({ message: `Mentor replacing successful!`}).code(200);
    }
    catch (error) {
        console.error(error.stack);
        return h.response({error: true, message: 'Bad Request'}).code(400);
    }
}

const deleteMentorCandidateMappingRecord = async (request, h) => {
  try{
      if (!request.auth.isAuthenticated) {
          return h.response({ message: 'Forbidden'}).code(403);
      }
      // Checking user type from jwt
      let luserTypeName = request.auth.artifacts.decoded.userTypeName;   
      if(luserTypeName !== 'companysuperadmin') return h.response({error:true, message:'You are not authorized!'}).code(403);
      
      const { credentials } = request.auth || {};
      const { id: userId } = credentials || {};
      
      const { candidateId } = request.params || {};        
              
      const { Userinfo, Mentorcandidatemapping } = request.getModels('xpaxr');

      // get the company of the luser
      const userRecord = await Userinfo.findOne({ where: { userId }, attributes: { exclude: ['createdAt', 'updatedAt'] }});
      const userProfileInfo = userRecord && userRecord.toJSON();
      const { companyId: luserCompanyId } = userProfileInfo || {};        
                 
      // is already linked
      const alreadyLinkedRecord = await Mentorcandidatemapping.findOne({ where: { candidateId }});
      const alreadyLinkedInfo = alreadyLinkedRecord && alreadyLinkedRecord.toJSON();
      const { mentorcandidatemappingId, mentorId } = alreadyLinkedInfo || {};

      if(!mentorcandidatemappingId) return h.response({ error: true, message: `This candidate doesn't have a mentor!`}).code(400);

      // is the mentor from same company
      const mentorRecord = await Userinfo.findOne({ where: { userId: mentorId } });
      const mentorProfileInfo = mentorRecord && mentorRecord.toJSON();
      const { userId: mUserId, companyId: mCompanyId } = mentorProfileInfo || {};
      
      if(!mUserId) return h.response({error: true, message: 'No user found for this mentorId.'}).code(400);
      if(luserCompanyId !== mCompanyId) return h.response({error: true, message: 'The mentor is not from the same company.'}).code(400);

      await Mentorcandidatemapping.destroy({ where: { candidateId, mentorId } });

      return h.response({ message: `Record deletion successful!`}).code(200);
  }
  catch (error) {
      console.error(error.stack);
      return h.response({error: true, message: 'Bad Request'}).code(400);
  }
}

module.exports = {
  mentorCandidateLinking,
  getMentorCandidates,
  getAllMentorCandidates,
  replaceMentorForOne,
  replaceMentorForAll,
  deleteMentorCandidateMappingRecord,  
}