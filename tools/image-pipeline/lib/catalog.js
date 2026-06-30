const path = require('path');
const {existsSync} = require('fs');
const {readReviewState, writeJson, readJson, getApprovedSpeciesPath} = require('./cache');
const {loadLegacyImages, readReviewCandidates} = require('./app-image-candidates');

const getApprovedCandidate = (candidates, decision) => {
    if (!decision?.candidateId) {
        return null;
    }

    return candidates.find(candidate => candidate.id === decision.candidateId) ?? null;
};

const generateCatalog = (cacheRoot, speciesList) => {
    const reviewState = readReviewState(cacheRoot);
    const appImages = loadLegacyImages();
    const entries = [];

    for (const species of speciesList) {
        const candidates = readReviewCandidates(cacheRoot, species, {appImages});
        const decision = reviewState.decisions[species.speciesCode];
        const approvedCandidate = getApprovedCandidate(candidates, decision);
        const approvedPath = getApprovedSpeciesPath(cacheRoot, species.speciesCode);
        const approvedMetaPath = path.join(approvedPath, 'meta.json');
        const approvedMeta = existsSync(approvedMetaPath)
            ? readJson(approvedMetaPath, null)
            : null;

        const approvedImage = approvedCandidate ? {
            candidateId: approvedCandidate.id,
            source: approvedCandidate.source,
            sourceUrl: approvedCandidate.sourceUrl,
            imageUrl: approvedCandidate.imageUrl,
            thumbnailUrl: approvedCandidate.thumbnailUrl,
            photographer: approvedCandidate.photographer,
            license: approvedCandidate.license,
            attribution: approvedCandidate.attribution
        } : null;

        if (approvedImage && approvedMeta?.images) {
            approvedImage.local = {
                original: approvedMeta.original?.path ? `approved/${species.speciesCode}/${approvedMeta.original.path}` : null,
                512: approvedMeta.images['512'] ? `approved/${species.speciesCode}/${approvedMeta.images['512']}` : null,
                256: approvedMeta.images['256'] ? `approved/${species.speciesCode}/${approvedMeta.images['256']}` : null,
                meta: `approved/${species.speciesCode}/meta.json`
            };
            approvedImage.crop = approvedMeta.crop ?? null;
        }

        entries.push({
            commonName: species.commonName,
            scientificName: species.scientificName,
            speciesCode: species.speciesCode,
            taxonomicOrder: species.taxonomicOrder,
            status: decision?.status ?? (candidates.length ? 'needs_review' : 'missing'),
            approvedImages: approvedImage ? [approvedImage] : []
        });
    }

    const catalog = {
        schemaVersion: 1,
        generatedAt: new Date().toISOString(),
        entries
    };

    writeJson(path.join(cacheRoot, 'catalog.json'), catalog);
    return catalog;
};

module.exports = {
    generateCatalog
};
