const path = require('path');
const {readJson, writeJson} = require('./cache');

const mergeAppImages = (options) => {
    const basePath = path.resolve(options.basePath);
    const overlayPath = path.resolve(options.overlayPath);
    const outputPath = path.resolve(options.outputPath);
    const baseImages = readJson(basePath, {});
    const overlayImages = readJson(overlayPath, {});
    const mergedImages = {
        ...baseImages,
        ...overlayImages
    };

    writeJson(outputPath, mergedImages);

    return {
        outputPath,
        baseCount: Object.keys(baseImages).length,
        overlayCount: Object.keys(overlayImages).length,
        mergedCount: Object.keys(mergedImages).length,
        replacedCount: Object.keys(overlayImages).filter(key => Object.prototype.hasOwnProperty.call(baseImages, key)).length
    };
};

module.exports = {
    mergeAppImages
};
