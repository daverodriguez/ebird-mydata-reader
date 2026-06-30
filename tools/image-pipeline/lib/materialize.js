const {existsSync, mkdirSync, writeFileSync} = require('fs');
const path = require('path');
const sharp = require('sharp');
const {getBuffer} = require('./http');
const {readReviewState, writeJson, readJson, getApprovedSpeciesPath} = require('./cache');
const {readReviewCandidates} = require('./app-image-candidates');

const THUMBNAIL_SIZES = [512, 256, 128];

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

const getCenteredSquareCrop = (metadata) => {
    const side = Math.min(metadata.width, metadata.height);
    return {
        x: Math.floor((metadata.width - side) / 2),
        y: Math.floor((metadata.height - side) / 2),
        width: side,
        height: side,
        strategy: 'center-square'
    };
};

const normalizeCrop = (crop, metadata) => {
    const fallback = getCenteredSquareCrop(metadata);
    const maxSide = Math.min(metadata.width, metadata.height);
    const requestedWidth = Number(crop?.width ?? fallback.width);
    const requestedHeight = Number(crop?.height ?? requestedWidth);
    const side = Math.max(1, Math.min(maxSide, Math.round(Math.min(requestedWidth, requestedHeight))));
    const maxX = metadata.width - side;
    const maxY = metadata.height - side;

    return {
        x: Math.max(0, Math.min(maxX, Math.round(Number(crop?.x ?? fallback.x)))),
        y: Math.max(0, Math.min(maxY, Math.round(Number(crop?.y ?? fallback.y)))),
        width: side,
        height: side,
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
    for (const size of THUMBNAIL_SIZES) {
        await sharp(originalPath)
            .extract({
                left: crop.x,
                top: crop.y,
                width: crop.width,
                height: crop.height
            })
            .resize(size, size)
            .jpeg({
                quality: 86,
                mozjpeg: true
            })
            .toFile(path.join(approvedPath, `${size}.jpg`));
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
        images: Object.fromEntries(THUMBNAIL_SIZES.map(size => [String(size), `${size}.jpg`])),
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
