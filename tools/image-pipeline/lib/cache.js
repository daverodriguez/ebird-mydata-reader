const {existsSync, mkdirSync, readFileSync, writeFileSync} = require('fs');
const path = require('path');

const readJson = (filePath, fallback) => {
    if (!existsSync(filePath)) {
        return fallback;
    }

    return JSON.parse(readFileSync(filePath, 'utf8'));
};

const writeJson = (filePath, value) => {
    mkdirSync(path.dirname(filePath), {recursive: true});
    writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
};

const getSpeciesCandidatePath = (cacheRoot, speciesCode) => {
    return path.join(cacheRoot, 'source_candidates', speciesCode, 'candidates.json');
};

const readCandidates = (cacheRoot, speciesCode) => {
    return readJson(getSpeciesCandidatePath(cacheRoot, speciesCode), null);
};

const writeCandidates = (cacheRoot, speciesCode, candidates) => {
    writeJson(getSpeciesCandidatePath(cacheRoot, speciesCode), candidates);
};

const readReviewState = (cacheRoot) => {
    return readJson(path.join(cacheRoot, 'review_state.json'), {
        schemaVersion: 1,
        decisions: {}
    });
};

const writeReviewState = (cacheRoot, reviewState) => {
    writeJson(path.join(cacheRoot, 'review_state.json'), reviewState);
};

const getApprovedSpeciesPath = (cacheRoot, speciesCode) => {
    return path.join(cacheRoot, 'approved', speciesCode);
};

module.exports = {
    readJson,
    writeJson,
    getSpeciesCandidatePath,
    readCandidates,
    writeCandidates,
    readReviewState,
    writeReviewState,
    getApprovedSpeciesPath
};
