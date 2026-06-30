const crypto = require('crypto');

const makeCandidateId = (provider, stableValue) => {
    const hash = crypto
        .createHash('sha1')
        .update(`${provider}:${stableValue}`)
        .digest('hex')
        .slice(0, 16);

    return `${provider}:${hash}`;
};

module.exports = {
    makeCandidateId
};
