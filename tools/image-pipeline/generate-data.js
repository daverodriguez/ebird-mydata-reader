const path = require('path');
const {spawnSync} = require('child_process');
const {exportAppImages} = require('./lib/export-app-images');
const {mergeAppImages} = require('./lib/merge-app-images');

const repoRoot = path.resolve(__dirname, '../..');
const cacheRoot = path.join(repoRoot, 'image-cache');
const taxonomyPath = path.join(repoRoot, 'src/data/eBird_taxonomy_v2025.csv');
const pipelineImagesPath = path.join(repoRoot, 'src/data/species-images-pipeline.json');
const baseImagesPath = path.join(repoRoot, 'src/data/species-images-2025.json');
const mergedImagesPath = path.join(repoRoot, 'src/data/species-images-merged.json');

const exportResult = exportAppImages({
    cacheRoot,
    taxonomyPath,
    outputPath: pipelineImagesPath,
    assetBasePath: 'image-cache'
});

console.log(`app images: exported ${exportResult.exportedCount} approved images to ${exportResult.outputPath}`);
if (exportResult.skippedUnmaterialized) {
    console.log(`app images: skipped ${exportResult.skippedUnmaterialized} approved images without local materialized files`);
}

const mergeResult = mergeAppImages({
    basePath: baseImagesPath,
    overlayPath: pipelineImagesPath,
    outputPath: mergedImagesPath
});

console.log(`merged images: ${mergeResult.baseCount} base + ${mergeResult.overlayCount} overlay -> ${mergeResult.mergedCount} entries`);
console.log(`merged images: replaced ${mergeResult.replacedCount} base entries`);

const result = spawnSync(process.execPath, ['generate-taxonomy-data.js'], {
    cwd: repoRoot,
    stdio: 'inherit',
    env: {
        ...process.env,
        SPECIES_IMAGES_FILE: './src/data/species-images-merged.json'
    }
});

if (result.error) {
    throw result.error;
}

process.exitCode = result.status ?? 0;
