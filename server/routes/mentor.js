import {
  getMentorRandR,

  mentorCandidateLinking,
  getMentorCandidates,
  getAllMentorCandidates,

  replaceMentorForOne,
  replaceMentorForAll,
  deleteMentorCandidateMappingRecord,

  getMentorApplicantProfile,
  getAllMentorApplicantsSelectiveProfile,
} from "../controllers/mentor";

const xmentor = {
  name: 'xmentor',
  version: '0.1.0',

  register: async (server, options) => {
    try {
      server.route({
        method: 'GET',
        path: '/r-and-r',
        options: {
          auth: {
            mode: 'try',
          },
          handler: getMentorRandR,
        },
      });
      server.route({
        method: 'POST',
        path: '/mentor-candidate/{applicationId}',
        options: {
          auth: {
            mode: 'try',
          },
          handler: mentorCandidateLinking,
        },
      });
      server.route({
        method: 'GET',
        path: '/mentor-candidate/me',
        options: {
          auth: {
            mode: 'try',
          },
          handler: getMentorCandidates,
        },
      });
      server.route({
        method: 'GET',
        path: '/mentor-candidates/all',
        options: {
          auth: {
            mode: 'try',
          },
          handler: getAllMentorCandidates,
        },
      });
      server.route({
        method: 'PATCH',
        path: '/replace-mentor/one/{candidateId}',
        options: {
          auth: {
            mode: 'try',
          },
          handler: replaceMentorForOne,
        },
      });
      server.route({
        method: 'PATCH',
        path: '/replace-mentor/all/{oldMentorId}',
        options: {
          auth: {
            mode: 'try',
          },
          handler: replaceMentorForAll,
        },
      });
      server.route({
        method: 'DELETE',
        path: '/mentor-candidate/{candidateId}',
        options: {
          auth: {
            mode: 'try',
          },
          handler: deleteMentorCandidateMappingRecord,
        },
      });
      server.route({
        method: 'GET',
        path: '/mentee/{jobId}/{userId}',
        options: {
          auth: {
            mode: 'try',
          },
          handler: getMentorApplicantProfile,
        },
      });
      server.route({
        method: 'GET',
        path: '/all-applications',
        options: {
          auth: {
            mode: 'try',
          },
          handler: getAllMentorApplicantsSelectiveProfile,
        },
      });
    }
    catch (err) {
      console.log(err);
    }
  }
};

export default xmentor;
