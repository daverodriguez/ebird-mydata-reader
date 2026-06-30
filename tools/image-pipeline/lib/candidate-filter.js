const DISALLOWED_ATTRIBUTE_PHRASES = [
    'all rights reserved',
    'copyright by the creator',
    'xeno-canto'
];

const getStringAttributes = (value) => {
    if (typeof value === 'string') {
        return [value];
    }

    if (!value || typeof value !== 'object') {
        return [];
    }

    if (Array.isArray(value)) {
        return value.flatMap(getStringAttributes);
    }

    return Object.values(value).flatMap(getStringAttributes);
};

const getDisallowedAttributePhrases = (candidate) => {
    const attributes = getStringAttributes(candidate).map(value => value.toLowerCase());

    return DISALLOWED_ATTRIBUTE_PHRASES.filter(phrase => {
        return attributes.some(value => value.includes(phrase));
    });
};

const hasDisallowedAttributePhrase = (candidate) => {
    return getDisallowedAttributePhrases(candidate).length > 0;
};

const filterDisallowedCandidates = (candidates) => {
    const kept = [];
    const removed = [];

    for (const candidate of candidates) {
        const disallowedPhrases = getDisallowedAttributePhrases(candidate);
        if (disallowedPhrases.length) {
            removed.push({
                candidate,
                disallowedPhrases
            });
        } else {
            kept.push(candidate);
        }
    }

    return {
        kept,
        removed
    };
};

module.exports = {
    DISALLOWED_ATTRIBUTE_PHRASES,
    getDisallowedAttributePhrases,
    hasDisallowedAttributePhrase,
    filterDisallowedCandidates
};
