const
	jwt = require('jsonwebtoken')
;

const redis = require('./redis')
const crypto = require('crypto');
const prefix_oauth = "api_tokens";

module.exports = {
	removeOauth: (oauth_id) => new Promise(async(resolve,reject) => {
		try {
			let oauth = await getOauthKeyByHash(oauth_id);
			oauth.value.oauths = oauth.value.oauths.filter(oauth_ => oauth_.hash != oauth_id);
			await redis.setJSON(oauth.key,"$",oauth.value);
			resolve(!0);
		} catch (e) {
			resolve(false);
		}
	}),
	checkOauth: async(access_token, client_secret) => new Promise(resolve => {
		const object = client_secret
			? jwt.verify(access_token, client_secret)
			: jwt.decode(access_token)
		;

		const key = `${prefix_oauth}:${object.client_id}:${object.user_id}`;
		redis.getJSON(key).then(resolve);
	}),
	createOauth: (req, res, user_id) => new Promise(async(resolve,reject) => {
		try {
			let ip = req.ip;
			if(!user_id) {
				user_id = await module.exports.getUserByOauth(req.signedCookies['__oauth']);
			}

			const key = `${prefix_oauth}:${user_id}`;
			const exists = await redis.exists(key);

			const oauth = {
				ip: ip,
				hash:generateOauthHASH(user_id,ip)
			}
			if(exists) {
				const oauth_ = await redis.getJSON(key);
				await redis.setExpireJSON(key,"$.oauths",[...oauth_.oauths,oauth],0,7);
			} else {
				await redis.setExpireJSON(key,"$",{oauths:[oauth]},0,7);
			}
			resolve(oauth);
		} catch (e) {
			reject(e);
		}
	}),
	getUserByOauth: (oauth_id) => new Promise(async(resolve,reject) => {
		try {
			const key = await getOauthKeyByHash(oauth_id);
			const split_ = key.key.split(":");
			const user_id = split_[split_.length-1];
			resolve(Number.parseInt(user_id));
		} catch(e) {
			console.error(e);
			resolve(false);
		}
	}),
	getOauthByHash: (oauth_id) => new Promise(async(resolve,reject) => {
		try {
			const keys = await redis.getKeys(`${prefix_oauth}:*`);
			let found;
			for(const key of keys) {
				let value = await redis.getJSON(key);
				if(value && Array.isArray(value.oauths)) {
					found = value.oauths.find(oauth => oauth.hash == oauth_id);
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
	clearUserOauths: async(user_id) => {
		const key = `${prefix_oauth}:*:${user_id}`;
		await redis.del(key);
	},
	getOauthsByUserId: async(user_id) => {
		const key = `${prefix_oauth}:*:${user_id}`;
		const oauths = await redis.getJSON(key);
		if (oauths) {
			return oauths.oauths;
		} else {
			return [];
		}
	}
}

async function getOauthKeyByHash(hash) {
	const keys = await redis.getKeys(`${prefix_oauth}:*`);
	let found;
	for(const key of keys) {
		let value = await redis.getJSON(key);
		if(value && Array.isArray(value.oauths)) {
			found = value.oauths.find(oauth => oauth.hash == hash);
			if(found) return {key:key,value:value,found:found};
		}
	}
	throw new Error("Sessão não encontrada.");
}

function generateOauthHASH(user_id,ip) {
	const randomBytes = crypto.randomBytes(64).toString("base64");
	const secret = process.env.hash_secret ? process.env.hash_secret : "";
	const salt = crypto.createHash("sha256").update(secret).digest("base64");
	return crypto.createHash("sha256").update(`${user_id}${ip}${randomBytes}${salt}`).digest("hex");
}


module.exports.checkOauth(
	"ABC1234"
)