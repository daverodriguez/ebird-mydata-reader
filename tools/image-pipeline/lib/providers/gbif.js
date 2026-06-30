const crypto = require('crypto');
const {getJson} = require('../http');
const {makeCandidateId} = require('../ids');

const name = 'gbif';

const md5 = (value) => crypto.createHash('md5').update(value).digest('hex');

const searchSpecies = async (species, options) => {
    const matchUrl = new URL('https://api.gbif.org/v1/species/match');
    matchUrl.searchParams.set('name', species.scientificName);
    matchUrl.searchParams.set('rank', 'SPECIES');

    const match = await getJson(matchUrl.toString());
    if (!match.usageKey) {
        return [];
    }

    const searchUrl = new URL('https://api.gbif.org/v1/occurrence/search');
    searchUrl.searchParams.set('taxonKey', String(match.usageKey));
    searchUrl.searchParams.set('mediaType', 'StillImage');
    searchUrl.searchParams.set('limit', String(options.limit));

    const response = await getJson(searchUrl.toString());
    const candidates = [];

    for (const occurrence of response.results ?? []) {
        for (const media of occurrence.media ?? []) {
            if (!media.identifier) {
                continue;
            }

            const cacheUrl = `https://api.gbif.org/v1/image/cache/occurrence/${occurrence.key}/media/${md5(media.identifier)}`;
            const photographer = media.creator
                ?? occurrence.recordedBy
                ?? occurrence.identifiedBy
                ?? null;

            candidates.push({
                id: makeCandidateId(name, `${occurrence.key}:${media.identifier}`),
                speciesCode: species.speciesCode,
                source: name,
                sourceUrl: occurrence.references ?? `https://www.gbif.org/occurrence/${occurrence.key}`,
                imageUrl: media.identifier,
                thumbnailUrl: cacheUrl,
                photographer,
                license: media.license ?? occurrence.license ?? null,
                attribution: media.rightsHolder ?? photographer,
                originalWidth: null,
                originalHeight: null,
                providerRank: candidates.length + 1,
                retrievedAt: new Date().toISOString(),
                raw: {
                    occurrenceKey: occurrence.key,
                    datasetKey: occurrence.datasetKey,
                    gbifTaxonKey: match.usageKey,
                    basisOfRecord: occurrence.basisOfRecord
                }
            });

            if (candidates.length >= options.limit) {
                return candidates;
            }
        }
    }

    return candidates;
};

module.exports = {
    name,
    searchSpecies
};
