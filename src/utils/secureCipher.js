import crypto from 'crypto';
let keyBase64 = process.env.KEY_BASE_64;
let ivBase64 = process.env.IV_BASR_64;

function getAlgorithm(keyBase64) {
    let key = Buffer.from(keyBase64, 'base64');
    switch (key.length) {
        case 16:
            return 'aes-128-cbc';
        case 32:
            return 'aes-256-cbc';
    };
    throw new Error('Invalid key length: ' + key.length);
};

export function encrypt(plainText, callback) {
    try {
        const key = Buffer.from(keyBase64, 'base64');
        const iv = Buffer.from(ivBase64, 'base64');
        const cipher = crypto.createCipheriv(getAlgorithm(keyBase64), key, iv);
        let encrypted = cipher.update(plainText, 'utf8', 'base64')
        encrypted += cipher.final('base64');
        return callback(encrypted.toString());
    } catch (err) {
        return callback(err)
    };
};

export function decrypt(messagebase64, callback) {
    try {
        const key = Buffer.from(keyBase64, 'base64');
        const iv = Buffer.from(ivBase64, 'base64');
        const decipher = crypto.createDecipheriv(getAlgorithm(keyBase64), key, iv);
        let decrypted = decipher.update(messagebase64, 'base64');
        decrypted += decipher.final();
        return callback(decrypted.toString());
    } catch (err) {
        callback(err);
    };
};

export function extractDomain(fullUrl) {
    try {
        let urlObj = new URL(fullUrl);

        let domain = urlObj.hostname.replace(/^www\./, "");

        const parts = domain.split(".");
        if (parts.length > 2) {
            domain = parts.slice(-2).join(".");
        }
        return `https://${domain}`;
    } catch (err) {
        return null;
    }
}

