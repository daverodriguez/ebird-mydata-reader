const http = require('http');
const {existsSync, createReadStream, statSync} = require('fs');
const path = require('path');
const {URL} = require('url');
const {loadSpecies} = require('./taxonomy');
const {
    readReviewState,
    writeReviewState,
    getApprovedSpeciesPath
} = require('./cache');
const {loadLegacyImages, readReviewCandidates} = require('./app-image-candidates');
const {generateCatalog} = require('./catalog');
const {materializeSpecies} = require('./materialize');

const REVIEW_PUBLIC_PATH = path.resolve(__dirname, '../public');

const contentTypes = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp'
};

const sendJson = (response, statusCode, value) => {
    response.writeHead(statusCode, {'Content-Type': 'application/json; charset=utf-8'});
    response.end(JSON.stringify(value, null, 2));
};

const sendError = (response, statusCode, message) => {
    sendJson(response, statusCode, {error: message});
};

const readBody = (request) => {
    return new Promise((resolve, reject) => {
        let body = '';
        request.setEncoding('utf8');
        request.on('data', chunk => body += chunk);
        request.on('end', () => {
            if (!body) {
                resolve({});
                return;
            }

            try {
                resolve(JSON.parse(body));
            } catch (error) {
                reject(new Error(`Invalid JSON request body: ${error.message}`));
            }
        });
        request.on('error', reject);
    });
};

const normalizeStaticPath = (rootPath, requestPath) => {
    const relativePath = decodeURIComponent(requestPath).replace(/^\/+/, '');
    const resolved = path.resolve(rootPath, relativePath);
    if (!resolved.startsWith(rootPath)) {
        return null;
    }

    return resolved;
};

const serveFile = (response, filePath) => {
    if (!filePath || !existsSync(filePath) || statSync(filePath).isDirectory()) {
        sendError(response, 404, 'Not found');
        return;
    }

    response.writeHead(200, {
        'Content-Type': contentTypes[path.extname(filePath).toLowerCase()] ?? 'application/octet-stream'
    });
    createReadStream(filePath).pipe(response);
};

const getApprovedMeta = (cacheRoot, speciesCode) => {
    const metaPath = path.join(getApprovedSpeciesPath(cacheRoot, speciesCode), 'meta.json');
    if (!existsSync(metaPath)) {
        return null;
    }

    return JSON.parse(require('fs').readFileSync(metaPath, 'utf8'));
};

const findSpecies = (speciesByCode, speciesCode) => {
    const species = speciesByCode.get(speciesCode);
    if (!species) {
        throw new Error(`Unknown species code "${speciesCode}"`);
    }

    return species;
};

const buildSpeciesSummary = (cacheRoot, species, decision, appImages) => {
    const candidates = readReviewCandidates(cacheRoot, species, {appImages});
    const approvedMeta = getApprovedMeta(cacheRoot, species.speciesCode);
    return {
        commonName: species.commonName,
        scientificName: species.scientificName,
        speciesCode: species.speciesCode,
        taxonomicOrder: species.taxonomicOrder,
        family: species.family,
        status: decision?.status ?? (candidates.length ? 'needs_review' : 'missing'),
        candidateCount: candidates.length,
        approvedCandidateId: decision?.candidateId ?? null,
        rejectedCandidateIds: decision?.rejectedCandidateIds ?? [],
        materialized: Boolean(approvedMeta),
        localThumbnail: approvedMeta?.images?.['256']
            ? `/cache/approved/${species.speciesCode}/${approvedMeta.images['256']}`
            : null
    };
};

const createReviewServer = (options) => {
    const cacheRoot = path.resolve(options.cacheRoot);
    const taxonomyPath = path.resolve(options.taxonomyPath);
    const speciesList = loadSpecies(taxonomyPath);
    const speciesByCode = new Map(speciesList.map(species => [species.speciesCode, species]));
    const appImages = loadLegacyImages(options.appImagesPath);

    const handleApi = async (request, response, url) => {
        const reviewState = readReviewState(cacheRoot);

        if (request.method === 'GET' && url.pathname === '/api/species') {
            const query = (url.searchParams.get('q') ?? '').toLowerCase();
            const withCandidates = url.searchParams.get('withCandidates') === '1';
            let summaries = speciesList.map(species => buildSpeciesSummary(
                cacheRoot,
                species,
                reviewState.decisions[species.speciesCode],
                appImages
            ));

            if (withCandidates) {
                summaries = summaries.filter(species => species.candidateCount > 0 || species.approvedCandidateId);
            }

            if (query) {
                summaries = summaries.filter(species => {
                    return species.commonName.toLowerCase().includes(query)
                        || species.scientificName.toLowerCase().includes(query)
                        || species.speciesCode.toLowerCase().includes(query)
                        || species.family?.toLowerCase().includes(query);
                });
            }

            sendJson(response, 200, {species: summaries});
            return;
        }

        const speciesMatch = url.pathname.match(/^\/api\/species\/([^/]+)$/);
        if (request.method === 'GET' && speciesMatch) {
            const speciesCode = speciesMatch[1];
            const species = findSpecies(speciesByCode, speciesCode);
            const candidates = readReviewCandidates(cacheRoot, species, {appImages});
            const decision = reviewState.decisions[speciesCode] ?? null;
            sendJson(response, 200, {
                species: buildSpeciesSummary(cacheRoot, species, decision, appImages),
                decision,
                candidates,
                approvedMeta: getApprovedMeta(cacheRoot, speciesCode)
            });
            return;
        }

        if (request.method === 'POST' && url.pathname === '/api/approve') {
            const body = await readBody(request);
            const species = findSpecies(speciesByCode, body.speciesCode);
            const candidates = readReviewCandidates(cacheRoot, species, {appImages});
            if (!candidates.find(candidate => candidate.id === body.candidateId)) {
                throw new Error(`Candidate "${body.candidateId}" was not found for ${species.speciesCode}`);
            }

            const current = reviewState.decisions[species.speciesCode] ?? {};
            reviewState.decisions[species.speciesCode] = {
                ...current,
                status: body.status ?? 'manual_approved',
                candidateId: body.candidateId,
                crop: current.candidateId === body.candidateId ? current.crop ?? null : null,
                rejectedCandidateIds: (current.rejectedCandidateIds ?? [])
                    .filter(candidateId => candidateId !== body.candidateId),
                updatedAt: new Date().toISOString()
            };
            writeReviewState(cacheRoot, reviewState);
            sendJson(response, 200, {ok: true, decision: reviewState.decisions[species.speciesCode]});
            return;
        }

        if (request.method === 'POST' && url.pathname === '/api/reject') {
            const body = await readBody(request);
            const species = findSpecies(speciesByCode, body.speciesCode);
            const current = reviewState.decisions[species.speciesCode] ?? {};
            const rejectedCandidateIds = Array.from(new Set([
                ...(current.rejectedCandidateIds ?? []),
                body.candidateId
            ]));

            reviewState.decisions[species.speciesCode] = {
                ...current,
                rejectedCandidateIds,
                status: current.candidateId === body.candidateId ? 'needs_review' : current.status ?? 'needs_review',
                candidateId: current.candidateId === body.candidateId ? null : current.candidateId,
                crop: current.candidateId === body.candidateId ? null : current.crop,
                updatedAt: new Date().toISOString()
            };
            writeReviewState(cacheRoot, reviewState);
            sendJson(response, 200, {ok: true, decision: reviewState.decisions[species.speciesCode]});
            return;
        }

        if (request.method === 'POST' && url.pathname === '/api/materialize') {
            const body = await readBody(request);
            const species = findSpecies(speciesByCode, body.speciesCode);
            const result = await materializeSpecies(cacheRoot, species);
            if (result.skipped) {
                sendError(response, 409, result.reason);
                return;
            }
            sendJson(response, 200, {ok: true, result, approvedMeta: getApprovedMeta(cacheRoot, species.speciesCode)});
            return;
        }

        if (request.method === 'POST' && url.pathname === '/api/crop') {
            const body = await readBody(request);
            const species = findSpecies(speciesByCode, body.speciesCode);
            const current = reviewState.decisions[species.speciesCode];
            if (!current?.candidateId) {
                throw new Error(`${species.speciesCode} has no approved candidate`);
            }

            const crop = body.crop ?? {};
            reviewState.decisions[species.speciesCode] = {
                ...current,
                crop: {
                    x: Number(crop.x),
                    y: Number(crop.y),
                    width: Number(crop.width),
                    height: Number(crop.height ?? crop.width),
                    strategy: 'manual'
                },
                updatedAt: new Date().toISOString()
            };
            writeReviewState(cacheRoot, reviewState);

            const result = await materializeSpecies(cacheRoot, species);
            if (result.skipped) {
                sendError(response, 409, result.reason);
                return;
            }

            generateCatalog(cacheRoot, [species]);
            sendJson(response, 200, {
                ok: true,
                decision: reviewState.decisions[species.speciesCode],
                approvedMeta: getApprovedMeta(cacheRoot, species.speciesCode)
            });
            return;
        }

        if (request.method === 'POST' && url.pathname === '/api/catalog') {
            const body = await readBody(request);
            const scopedSpecies = body.speciesCode
                ? [findSpecies(speciesByCode, body.speciesCode)]
                : speciesList;
            const catalog = generateCatalog(cacheRoot, scopedSpecies);
            sendJson(response, 200, {ok: true, entries: catalog.entries.length});
            return;
        }

        sendError(response, 404, 'Unknown API route');
    };

    return http.createServer((request, response) => {
        const url = new URL(request.url, 'http://localhost');

        Promise.resolve().then(async () => {
            if (url.pathname.startsWith('/api/')) {
                await handleApi(request, response, url);
                return;
            }

            if (url.pathname.startsWith('/cache/')) {
                const filePath = normalizeStaticPath(cacheRoot, url.pathname.replace(/^\/cache\//, ''));
                serveFile(response, filePath);
                return;
            }

            const publicPath = url.pathname === '/'
                ? path.join(REVIEW_PUBLIC_PATH, 'review.html')
                : normalizeStaticPath(REVIEW_PUBLIC_PATH, url.pathname);
            serveFile(response, publicPath);
        }).catch(error => {
            sendError(response, 500, error.message);
        });
    });
};

const startReviewServer = (options) => {
    const server = createReviewServer(options);
    const port = Number(options.port ?? 4173);
    const host = options.host ?? '127.0.0.1';

    return new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(port, host, () => {
            server.off('error', reject);
            resolve({
                server,
                url: `http://${host}:${port}/`
            });
        });
    });
};

module.exports = {
    createReviewServer,
    startReviewServer
};
