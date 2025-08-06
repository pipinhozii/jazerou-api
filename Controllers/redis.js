require('dotenv').config();
const { createClient } = require('redis');

const client = createClient({
    username: process.env.redis_local == 1 ? process.env.redis_user_local : process.env.redis_user,
    password: process.env.redis_local == 1 ? process.env.redis_password_local : process.env.redis_password,
    url: `redis://${process.env.redis_local == 1 ? process.env.redis_url_local : process.env.redis_url}`
});

client.on('connect', () => console.log("Redis connecting..."))
client.on('error', (err) => console.log('Redis Client Error', err));
client.on('ready', () => console.log('Redis Ready'));
client.on('end', (err) => console.log('Redis Ended'));
client.on('reconnecting', (err) => console.log('Redis Reconnecting'));

client.connect();

module.exports = {
    json_incr_by: async(key, path, by) => {
        if(!client.isOpen) await client.connect();
        const result = await client.json.numIncrBy(key, path, by)
        return result;
    },
    exists: async(key) => {
        if (!client.isOpen) await client.connect();
        const result = await client.exists(key);
        return result;
    },
    get: async(key) => {
        const exists = await module.exports.exists(key);
        if (exists) {
            if (!client.isOpen) await client.connect();
            const value = await client.get(key);
            return value;
        } else {
            return undefined;
        }
    },
    getJSON: async(key) => {
        const exists = await module.exports.exists(key);
        if (exists) {
            if (!client.isOpen) await client.connect();
            const value = await client.json.get(key);
            return value;
        } else {
            return undefined;
        }
    },
    getAll: async(keys) => {
        try {
            if(!client.isOpen) await client.connect();
            const result = await client.json.mGet(keys, "$");
            return result
        } catch (error) {
            if(process.env.log_error) console.error(error);
            return undefined
        }
    },
    getKeys: async(pattern) => {
        const keys = await client.KEYS(pattern);
        return keys;
    },
    setJSON: async(key, path, value, expireAt) => {
        if (!client.isOpen) await client.connect();
        await client.json.set(key, path, value);
        if (expireAt) await client.expireAt(key, expireAt);
    },
    setExpireJSON: async(key, path, value, minutesToExpire, hoursToExpire) => {
        if (!client.isOpen) await client.connect();
        await client.json.set(key, path, value);
        minutesToExpire = minutesToExpire + ((hoursToExpire ? hoursToExpire : 0) * 60);
        const min_ms = 60000;
        const expiresMinutes = Number.parseInt((new Date().getTime() + (min_ms * (minutesToExpire ? minutesToExpire : 1))) / 1000);
        await client.expireAt(key, expiresMinutes);
    },
    setExpire: async(key, value, minutesToExpire, hoursToExpire) => {
        if (!client.isOpen) await client.connect();
        await client.set(key, value);
        minutesToExpire = minutesToExpire + ((hoursToExpire ? hoursToExpire : 0) * 60);
        const min_ms = 60000;
        const expiresMinutes = Number.parseInt((new Date().getTime() + (min_ms * (minutesToExpire ? minutesToExpire : 1))) / 1000);
        await client.expireAt(key, expiresMinutes);
    },
    set: async(key, value, expireAt) => {
        if (!client.isOpen) await client.connect();
        await client.set(key, value);
        if (expireAt) await client.expireAt(key, expireAt);
    },
    del: async(key) => {
        if (!client.isOpen) await client.connect();
        await client.del(key);
    }
}

async function clear_cache(pattern) {
    const keys = await module.exports.getKeys(pattern);
    for(const key of keys) {
        console.log(`${key}...`)
        await module.exports.del(key);
    }
    console.log("DONE!")
}