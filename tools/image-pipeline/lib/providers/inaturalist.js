const {getJson} = require('../http');
const {makeCandidateId} = require('../ids');

const name = 'inaturalist';

const getBestPhotoUrl = (photo) => {
    if (!photo?.url) {
        return null;
    }

    return photo.url
        .replace('/square.', '/original.')
        .replace('/small.', '/original.')
        .replace('/medium.', '/original.')
        .replace('/large.', '/original.');
};

const normalizeLicense = (licenseCode) => {
    if (!licenseCode) {
        return null;
    }

    const normalized = String(licenseCode).toUpperCase();
    return normalized.startsWith('CC-') ? normalized : `CC-${normalized}`;
};

const searchSpecies = async (species, options) => {
    const url = new URL('https://api.inaturalist.org/v1/observations');
    url.searchParams.set('taxon_name', species.scientificName);
    url.searchParams.set('photos', 'true');
    url.searchParams.set('quality_grade', 'research');
    url.searchParams.set('order_by', 'votes');
    url.searchParams.set('order', 'desc');
    url.searchParams.set('per_page', String(options.limit));

    const response = await getJson(url.toString());
    const candidates = [];

    for (const observation of response.results ?? []) {
        for (const photo of observation.photos ?? []) {
            const imageUrl = getBestPhotoUrl(photo);
            if (!imageUrl) {
                continue;
            }

            const license = normalizeLicense(photo.license_code ?? observation.license_code);
            const photographer = photo.attribution
                ?? observation.user?.name
                ?? observation.user?.login
                ?? null;

            candidates.push({
                id: makeCandidateId(name, String(photo.id ?? imageUrl)),
                speciesCode: species.speciesCode,
                source: name,
                sourceUrl: observation.uri ?? `https://www.inaturalist.org/observations/${observation.id}`,
                imageUrl,
                thumbnailUrl: photo.url,
                photographer,
                license,
                attribution: photo.attribution ?? photographer,
                originalWidth: photo.original_dimensions?.width ?? null,
                originalHeight: photo.original_dimensions?.height ?? null,
                providerRank: candidates.length + 1,
                retrievedAt: new Date().toISOString(),
                raw: {
                    observationId: observation.id,
                    photoId: photo.id,
                    qualityGrade: observation.quality_grade,
                    taxonName: observation.taxon?.name
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
