import { QueryTypes } from 'sequelize';
import { formatQueryRes } from '../utils/index';
const jwt = require('jsonwebtoken');
const config = require('config');

const xjwt = {
    name: 'xjwt',
    version: '0.1.0',
    register: async (server, options) => {
        await server.register(require('hapi-auth-jwt2'));
        server.auth.strategy('jwt', 'jwt', {
            key: config.get('jwtSecret'),
            validate: async (decoded, request, h) => {
                const {authorization} = request.headers || {};
                const token = authorization.split(' ')[1];
                const db1 = request.getDb('xpaxr');
                const sqlStmt = `select * from hris.accesstoken ato
                        inner join hris.userinfo ui on ato.user_id=ui.user_id where ato.token= :token and is_valid=true`;
                const sequelize = db1.sequelize;
                const ares = await sequelize.query(sqlStmt, {
                        type: QueryTypes.SELECT,
                        replacements: { token: token },
                    });
                const uinfo = formatQueryRes(ares);
                const { userId } = uinfo || {};
                if(userId) {
                    const credentials = { id: userId, token };
                    const artifacts = { luser: uinfo, };    // as per docs, artifacts saves only token & decoded info. So luser info won't be saved.
                    const { active } = uinfo || {};
                    let isValid = true;                    
                    if(!active) {
                        isValid= false;
                        console.log(isValid);
                        console.log(uinfo);
                        return h.response({ error: true, message: 'User account is inactive!'}).code(400);
                    }                    
                    return { isValid: isValid, credentials, artifacts };
                } else {
                    return { isValid: false, credentials: {}, artifacts: {} };
                }
            }
        });
        server.auth.default('jwt');
    },
}

export default xjwt;