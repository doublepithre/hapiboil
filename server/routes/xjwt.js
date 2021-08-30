import moment from 'moment';
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
                const { authorization } = request.headers || {};
                const token = authorization.split(' ')[1];
                const db1 = request.getDb('xpaxr');
                const sqlStmt = `select *
                    from hris.accesstoken ato
                            inner join hris.userinfo ui on ato.user_id=ui.user_id
                        where
                            ato.token= :token and is_valid=true
                            and ato.created_at > :expirationTime`;
                const sequelize = db1.sequelize;
                const expirationTime = moment().subtract('12', 'hours').toISOString();
                console.log({ expirationTime });
                const ares = await sequelize.query(sqlStmt, {
                    type: QueryTypes.SELECT,
                    replacements: { token: token, expirationTime },
                });
                const uinfo = formatQueryRes(ares);
                const { userId } = uinfo || {};

                // if leadership or sponsors, don't allow to log in
                const sqlStmt2 = `select * from hris.userinfo ui
                    inner join hris.userrole ur on ur.role_id=ui.role_id
                    inner join hris.usertype ut on ut.user_type_id=ui.user_type_id
                where user_id=:userId`;
                const ares2 = await sequelize.query(sqlStmt2, {
                    type: QueryTypes.SELECT,
                    replacements: { userId },
                });
                const uinfoData = formatQueryRes(ares2);
                const { userTypeName } = uinfoData || {};

                if (userTypeName === 'leadership' || userTypeName === 'supportstaff') {
                    return { isValid: false, credentials: {}, artifacts: {} };
                }

                if (userId) {
                    const credentials = { id: userId, token };
                    const artifacts = { luser: uinfo, };    // as per docs, artifacts saves only token & decoded info. So luser info won't be saved.
                    const { active } = uinfo || {};
                    let isValid = true;
                    if (!active) {
                        isValid = false;
                        console.log(isValid);
                        console.log(uinfo);
                        return h.response({ error: true, message: 'User account is inactive!' }).code(400);
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