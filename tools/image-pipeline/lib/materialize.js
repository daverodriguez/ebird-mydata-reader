const {existsSync, mkdirSync, writeFileSync} = require('fs');
const path = require('path');
const sharp = require('sharp');
const {getBuffer} = require('./http');
const {readReviewState, writeJson, readJson, getApprovedSpeciesPath} = require('./cache');
const {readReviewCandidates} = require('./app-image-candidates');

const CROP_ASPECT_RATIO = 4 / 3;
const CROP_IMAGE_SIZES = [512, 256];
const LONG_EDGE_IMAGE_SIZES = [
    {
        key: 'full640',
        filename: 'full640.jpg',
        size: 640
    }
];

const getApprovedCandidate = (cacheRoot, species) => {
    const reviewState = readReviewState(cacheRoot);
    const decision = reviewState.decisions[species.speciesCode];
    if (!decision?.candidateId) {
        return {
            decision,
            candidate: null
        };
    }

    const candidates = readReviewCandidates(cacheRoot, species);
    return {
        decision,
        candidate: candidates.find(candidate => candidate.id === decision.candidateId) ?? null
    };
};

const extensionFromContentType = (contentType) => {
    if (contentType?.includes('png')) {
        return 'png';
    }

    if (contentType?.includes('webp')) {
        return 'webp';
    }

    return 'jpg';
};

const getCenteredAspectCrop = (metadata) => {
    const widthLimitedHeight = metadata.width / CROP_ASPECT_RATIO;
    const heightLimitedWidth = metadata.height * CROP_ASPECT_RATIO;
    const width = Math.round(widthLimitedHeight <= metadata.height ? metadata.width : heightLimitedWidth);
    const height = Math.round(widthLimitedHeight <= metadata.height ? widthLimitedHeight : metadata.height);

    return {
        x: Math.floor((metadata.width - width) / 2),
        y: Math.floor((metadata.height - height) / 2),
        width,
        height,
        strategy: 'center-4:3'
    };
};

const normalizeCrop = (crop, metadata) => {
    const fallback = getCenteredAspectCrop(metadata);
    const requestedWidth = Number(crop?.width ?? fallback.width);
    const requestedHeight = Number(crop?.height ?? fallback.height);
    let width = Math.max(1, requestedWidth);
    let height = Math.max(1, requestedHeight);

    if (width / height < CROP_ASPECT_RATIO) {
        width = height * CROP_ASPECT_RATIO;
    } else {
        height = width / CROP_ASPECT_RATIO;
    }

    const scale = Math.min(1, metadata.width / width, metadata.height / height);
    width = Math.max(1, Math.round(width * scale));
    height = Math.max(1, Math.round(width / CROP_ASPECT_RATIO));
    if (height > metadata.height) {
        height = metadata.height;
        width = Math.max(1, Math.round(height * CROP_ASPECT_RATIO));
    }

    const sourceX = Number(crop?.x ?? fallback.x);
    const sourceY = Number(crop?.y ?? fallback.y);
    const sourceWidth = Number(crop?.width ?? fallback.width);
    const sourceHeight = Number(crop?.height ?? fallback.height);
    const centerX = sourceX + (sourceWidth / 2);
    const centerY = sourceY + (sourceHeight / 2);
    const maxX = metadata.width - width;
    const maxY = metadata.height - height;

    return {
        x: Math.max(0, Math.min(maxX, Math.round(centerX - (width / 2)))),
        y: Math.max(0, Math.min(maxY, Math.round(centerY - (height / 2)))),
        width,
        height,
        strategy: crop?.strategy ?? fallback.strategy
    };
};

const materializeSpecies = async (cacheRoot, species) => {
    const {decision, candidate} = getApprovedCandidate(cacheRoot, species);
    if (!candidate) {
        return {
            speciesCode: species.speciesCode,
            skipped: true,
            reason: decision?.candidateId
                ? `approved candidate ${decision.candidateId} was not found`
                : 'no approved candidate'
        };
    }

    const approvedPath = getApprovedSpeciesPath(cacheRoot, species.speciesCode);
    mkdirSync(approvedPath, {recursive: true});

    const originalMetaPath = path.join(approvedPath, 'meta.json');
    const existingMeta = existsSync(originalMetaPath)
        ? readJson(originalMetaPath, null)
        : null;

    const canReuseOriginal = existingMeta?.candidate?.id === candidate.id;
    let originalPath = canReuseOriginal && existingMeta?.original?.path
        ? path.join(approvedPath, path.basename(existingMeta.original.path))
        : null;

    if (!originalPath || !existsSync(originalPath)) {
        const downloaded = await getBuffer(candidate.imageUrl);
        const extension = extensionFromContentType(downloaded.contentType);
        originalPath = path.join(approvedPath, `original.${extension}`);
        writeFileSync(originalPath, downloaded.buffer);
    }

    const image = sharp(originalPath);
    const metadata = await image.metadata();
    if (!metadata.width || !metadata.height) {
        throw new Error(`${species.speciesCode}: unable to read original image dimensions`);
    }

    const crop = normalizeCrop(decision.crop ?? existingMeta?.crop, metadata);
    for (const size of CROP_IMAGE_SIZES) {
        await sharp(originalPath)
            .extract({
                left: crop.x,
                top: crop.y,
                width: crop.width,
                height: crop.height
            })
            .resize(size, Math.round(size / CROP_ASPECT_RATIO))
            .jpeg({
                quality: 86,
                mozjpeg: true
            })
            .toFile(path.join(approvedPath, `${size}.jpg`));
    }

    for (const imageSize of LONG_EDGE_IMAGE_SIZES) {
        await sharp(originalPath)
            .resize({
                width: imageSize.size,
                height: imageSize.size,
                fit: 'inside'
            })
            .jpeg({
                quality: 86,
                mozjpeg: true
            })
            .toFile(path.join(approvedPath, imageSize.filename));
    }

    const meta = {
        schemaVersion: 1,
        species: {
            commonName: species.commonName,
            scientificName: species.scientificName,
            speciesCode: species.speciesCode,
            taxonomicOrder: species.taxonomicOrder
        },
        candidate,
        status: decision.status ?? 'manual_approved',
        crop,
        original: {
            path: path.basename(originalPath),
            width: metadata.width,
            height: metadata.height,
            format: metadata.format
        },
        images: {
            ...Object.fromEntries(CROP_IMAGE_SIZES.map(size => [String(size), `${size}.jpg`])),
            ...Object.fromEntries(LONG_EDGE_IMAGE_SIZES.map(imageSize => [imageSize.key, imageSize.filename]))
        },
        materializedAt: new Date().toISOString()
    };

    writeJson(originalMetaPath, meta);
    return {
        speciesCode: species.speciesCode,
        skipped: false,
        approvedPath,
        candidateId: candidate.id
    };
};

module.exports = {
    materializeSpecies
};
