import { QueryTypes } from 'sequelize';
import { formatQueryRes } from '../utils/index';

const xauth = {
  name: 'xauth',
  version: '0.1.0',
  register: async (server, options) => {
    await server.register(require('hapi-auth-bearer-token'));
    server.auth.strategy('simple', 'bearer-access-token', {
      allowQueryToken: false,
      validate: async (request, token, h) => {
      	const db1 = request.getDb('xpaxr');
      	const sqlStmt = `select * from hris.accesstoken ato
				inner join hris.userinfo ui on ato.userid=ui.user_id
				where ato.id= :token`;
				const sequelize = db1.sequelize;
      	const ares = await sequelize.query(sqlStmt, {
    			type: QueryTypes.SELECT,
    			replacements: { token: token },
    		});
    		const uinfo = formatQueryRes(ares);
        const { userId } = uinfo || {};
        if(userId) {
	        const credentials = { id: userId, token };
	        const artifacts = {
	        	luser: uinfo,
	        };
	        const { active } = uinfo || {};
	        let isValid = true;
	        if(!active) {
	        	isValid= false;
	        }
	        return { isValid: isValid, credentials, artifacts: artifacts };
        } else {
        	return { isValid: false, credentials: {}, artifacts: {} };
        }
      }
    });
    server.auth.default('simple');
  },
};

export default xauth;
