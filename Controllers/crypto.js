require('dotenv').config();

const crypto = require('crypto');
const SALT = process.env.crypto_salt || crypto.randomBytes(16).toString("base64");

module.exports = {
    /**
     * @param {string} string
     * @returns {string}
     */
    get_default_salty_hash: (string) => {
        const hash = crypto.createHmac('sha256', SALT)
                        .update(string)
                        .digest('hex');
        return hash;
    }
}