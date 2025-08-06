const redis = require('./redis')
const crypto = require('crypto');
const prefix_sessions = "user_sessions";

module.exports = {
    removeSession: (session_id) => new Promise(async(resolve,reject) => {
        try {
            let session = await getSessionKeyByHash(session_id);
            session.value.sessions = session.value.sessions.filter(session_ => session_.hash != session_id);
            await redis.setJSON(session.key,"$",session.value);
            resolve(!0);
        } catch (e) {
            resolve(false);
        }
    }),
    checkSession: async(req, res) => new Promise(async resolve => {
        try {
            if (req && req.signedCookies && req.signedCookies['__session']) {
                getSessionKeyByHash(req.signedCookies['__session'])
                .then(retorno => resolve(retorno)).catch(e => resolve(false));
            } else {
                resolve(false);
            }
        } catch (error) {
            console.log(error);
            resolve(false);
        }
    }),
    createSession: (req, res, user_id) => new Promise(async(resolve,reject) => {
        try {
            let ip = req.ip;
            if(!user_id) {
                user_id = await module.exports.getUserBySession(req.signedCookies['__session']);
            }

            const key = `${prefix_sessions}:${user_id}`;
            const exists = await redis.exists(key);

            const session = {
                ip: ip,
                hash:generateSessionHASH(user_id,ip)
            }
            if(exists) {
                const session_ = await redis.getJSON(key);
                await redis.setExpireJSON(key,"$.sessions",[...session_.sessions,session],0,7);
            } else {
                await redis.setExpireJSON(key,"$",{sessions:[session]},0,7);
            }
            resolve(session);
        } catch (e) {
            reject(e);
        }
    }),
    getUserBySession: (session_id) => new Promise(async(resolve,reject) => {
        try {
            const key = await getSessionKeyByHash(session_id);
            const split_ = key.key.split(":");
            const user_id = split_[split_.length-1];
            resolve(Number.parseInt(user_id));
        } catch(e) {
            console.error(e);
            resolve(false);
        }
    }),
    getSessionByHash: (session_id) => new Promise(async(resolve,reject) => {
        try {
            const keys = await redis.getKeys(`${prefix_sessions}:*`);
            let found;
            for(const key of keys) {
                let value = await redis.getJSON(key);
                if(value && Array.isArray(value.sessions)) {
                    found = value.sessions.find(session => session.hash == session_id);
                    if(found) {
                        const path_ = key.split(":");
                        const user_id = path_[path_.length-1];
                        found = {
                            ...found,
                            user: {
                                id: user_id
                            }
                        }
                        break;
                    }
                }
            }
            if(found) {
                resolve(found);
            } else {
                throw {type: 1,error: new Error("Sessão não encontrada.")};
            }
        } catch (e) {
            if(e instanceof Error) e = {type:0,error:e};
            reject(e);
        }
    }),
    getUserByTempSession: async(req,res) => {
        try {
            const token = req.signedCookies['temp_session'];
            const key = `user:temp_session:*:${token}`;
            const keys = await redis.getKeys(key);
            const user_id = keys.length > 0 ? keys[0].split(":")[2] : undefined;
            return user_id;
        } catch (error) {
            console.log(error);
            return false;
        }
    },
    clearUserSessions: async(user_id) => {
        const key = `${prefix_sessions}:${user_id}`;
        await redis.del(key);
    },
    getSessionsByUserId: async(user_id) => {
        const key = `${prefix_sessions}:${user_id}`;
        const sessions = await redis.getJSON(key);
        if (sessions) {
            return sessions.sessions;
        } else {
            return [];
        }
    },
    // Sessão de 30 minutos
    createTempSession: async(user_id, req, res) => {
        try {
            const salt = crypto.randomBytes(32).toString("base64");
            const current_date = new Date();
            const token = crypto.createHash("sha256").update(`${salt}:${user_id}:${current_date.getTime()}`).digest("base64url");
            const key = `user:temp_session:${user_id}:${token}`;
            const expiresHalfHour = Number.parseInt((current_date.getTime() + (60000 * 30)) / 1000);
            await redis.setJSON(key,"$",{user_id: user_id, token: token},expiresHalfHour);
            // res.cookie('temp_session',token,{maxAge: 60000 * 30});
            return token;
        } catch (error) {
            console.log(error);
            return false;
        }
    }
}

async function getSessionKeyByHash(hash) {
    const keys = await redis.getKeys(`${prefix_sessions}:*`);
    let found;
    for(const key of keys) {
        let value = await redis.getJSON(key);
        if(value && Array.isArray(value.sessions)) {
            found = value.sessions.find(session => session.hash == hash);
            if(found) return {key:key,value:value,found:found};
        }
    }
    throw new Error("Sessão não encontrada.");
}

function generateSessionHASH(user_id,ip) {
    const randomBytes = crypto.randomBytes(64).toString("base64");
    const secret = process.env.hash_secret ? process.env.hash_secret : "";
    const salt = crypto.createHash("sha256").update(secret).digest("base64");
    return crypto.createHash("sha256").update(`${user_id}${ip}${randomBytes}${salt}`).digest("hex");
}