const DISALLOWED_LICENSE_PARTS = [
    'NC',
    'ND'
];

const hasBlockedLicense = (license) => {
    if (!license) {
        return true;
    }

    const normalized = license.toUpperCase();
    return DISALLOWED_LICENSE_PARTS.some(part => normalized.includes(part));
};

const scoreCandidate = (candidate) => {
    const reasons = [];
    let score = 50;

    if (candidate.originalWidth && candidate.originalHeight) {
        const minDimension = Math.min(candidate.originalWidth, candidate.originalHeight);
        if (minDimension >= 1200) {
            score += 15;
            reasons.push('original dimensions are large');
        } else if (minDimension >= 512) {
            score += 8;
            reasons.push('original dimensions are usable');
        } else {
            score -= 10;
            reasons.push('original dimensions are small');
        }
    } else {
        reasons.push('original dimensions are unknown');
    }

    if (candidate.source === 'inaturalist') {
        score += 15;
        reasons.push('iNaturalist research-grade observation is likely a living bird');
    }

    if (candidate.source === 'gbif') {
        score += 8;
        reasons.push('GBIF occurrence media is biodiversity-linked');
    }

    if (candidate.source === 'wikimedia') {
        score += 5;
        reasons.push('Wikimedia candidate has reusable attribution metadata');
    }

    if (hasBlockedLicense(candidate.license)) {
        score -= 30;
        reasons.push('license is missing, non-commercial, or no-derivatives');
    } else {
        score += 10;
        reasons.push('license appears compatible with derivative thumbnails');
    }

    score -= Math.max(0, candidate.providerRank - 1);

    return {
        model: 'mock-v1',
        score: Math.max(0, Math.min(100, score)),
        rejected: false,
        rejectionReasons: [],
        needsReview: true,
        reasoning: reasons.join('; '),
        evaluatedAt: new Date().toISOString()
    };
};

module.exports = {
    scoreCandidate
};
