const path = require('path');
const {readCandidates, readJson} = require('./cache');

const DEFAULT_APP_IMAGES_PATH = path.resolve(__dirname, '../../../src/data/species-images-2025.json');

const loadLegacyImages = (appImagesPath = DEFAULT_APP_IMAGES_PATH) => {
    return readJson(appImagesPath, {});
};

const getLegacyImage = (species, appImagesPath = DEFAULT_APP_IMAGES_PATH) => {
    const appImages = loadLegacyImages(appImagesPath);
    return appImages[String(species.taxonomicOrder)] ?? null;
};

const legacyImageToCandidate = (species, image, sourcePath = DEFAULT_APP_IMAGES_PATH) => {
    if (!image?.medium && !image?.thumb && !image?.original) {
        return null;
    }

    const imageUrl = image.original ?? image.medium ?? image.thumb;
    const thumbnailUrl = image.thumb ?? image.medium ?? image.original;
    return {
        id: `species-images-2025:${species.taxonomicOrder}`,
        speciesCode: species.speciesCode,
        source: image.source ?? 'species-images-2025',
        sourceUrl: image.sourceUrl ?? imageUrl,
        imageUrl,
        thumbnailUrl,
        photographer: image.photographer ?? image.attribution ?? null,
        license: image.license ?? null,
        attribution: image.attribution ?? null,
        originalWidth: image.originalWidth ?? null,
        originalHeight: image.originalHeight ?? null,
        providerRank: 0,
        retrievedAt: null,
        raw: {
            sourceFile: path.basename(sourcePath),
            taxonomicOrder: species.taxonomicOrder,
            image
        },
        evaluation: {
            score: 'existing',
            reasoning: 'Existing app image from species-images-2025.json'
        }
    };
};

const readReviewCandidates = (cacheRoot, species, options = {}) => {
    const cachedCandidates = readCandidates(cacheRoot, species.speciesCode) ?? [];
    const appImagesPath = options.appImagesPath ?? DEFAULT_APP_IMAGES_PATH;
    const appImages = options.appImages ?? loadLegacyImages(appImagesPath);
    const legacyCandidate = legacyImageToCandidate(
        species,
        appImages[String(species.taxonomicOrder)] ?? null,
        appImagesPath
    );

    if (!legacyCandidate || cachedCandidates.some(candidate => candidate.id === legacyCandidate.id)) {
        return cachedCandidates;
    }

    return [legacyCandidate, ...cachedCandidates];
};

module.exports = {
    DEFAULT_APP_IMAGES_PATH,
    loadLegacyImages,
    getLegacyImage,
    readReviewCandidates
};
