const path = require('path');
const {loadSpecies} = require('./taxonomy');
const {generateCatalog} = require('./catalog');
const {writeJson} = require('./cache');

const normalizeAssetPath = (assetBasePath, localPath) => {
    if (!localPath) {
        return null;
    }

    return [assetBasePath.replace(/\/$/, ''), localPath.replace(/\\/g, '/')].join('/');
};

const exportAppImages = (options) => {
    const cacheRoot = path.resolve(options.cacheRoot);
    const taxonomyPath = path.resolve(options.taxonomyPath);
    const outputPath = path.resolve(options.outputPath);
    const assetBasePath = options.assetBasePath ?? 'image-cache';
    const includeRemoteApproved = Boolean(options.includeRemoteApproved);
    const speciesList = loadSpecies(taxonomyPath);
    const catalog = generateCatalog(cacheRoot, speciesList);
    const imagesByTaxonomicOrder = {};
    let skippedUnmaterialized = 0;

    for (const entry of catalog.entries) {
        const approvedImage = entry.approvedImages?.[0];
        if (!approvedImage) {
            continue;
        }

        const local = approvedImage.local ?? {};
        if (!local['256'] && !local['512'] && !includeRemoteApproved) {
            skippedUnmaterialized++;
            continue;
        }

        imagesByTaxonomicOrder[String(entry.taxonomicOrder)] = {
            thumb: normalizeAssetPath(assetBasePath, local['256']) ?? approvedImage.thumbnailUrl,
            medium: normalizeAssetPath(assetBasePath, local['512']) ?? approvedImage.imageUrl,
            original: normalizeAssetPath(assetBasePath, local.original) ?? approvedImage.imageUrl,
            meta: normalizeAssetPath(assetBasePath, local.meta),
            source: approvedImage.source,
            sourceUrl: approvedImage.sourceUrl,
            photographer: approvedImage.photographer,
            license: approvedImage.license,
            attribution: approvedImage.attribution,
            speciesCode: entry.speciesCode,
            commonName: entry.commonName,
            scientificName: entry.scientificName
        };
    }

    writeJson(outputPath, imagesByTaxonomicOrder);

    return {
        outputPath,
        exportedCount: Object.keys(imagesByTaxonomicOrder).length,
        catalogEntryCount: catalog.entries.length,
        skippedUnmaterialized
    };
};

module.exports = {
    exportAppImages
};
