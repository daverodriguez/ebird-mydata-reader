#!/usr/bin/env node
const path = require('path');
const {existsSync} = require('fs');
const {loadSpecies, selectSpecies} = require('./lib/taxonomy');
const {getProviders} = require('./lib/providers');
const {readCandidates, writeCandidates, readReviewState, writeReviewState} = require('./lib/cache');
const {scoreCandidate} = require('./lib/mock-scorer');
const {filterDisallowedCandidates} = require('./lib/candidate-filter');
const {generateCatalog} = require('./lib/catalog');
const {materializeSpecies} = require('./lib/materialize');
const {startReviewServer} = require('./lib/review-server');
const {exportAppImages} = require('./lib/export-app-images');
const {mergeAppImages} = require('./lib/merge-app-images');

const DEFAULT_TAXONOMY = path.resolve(__dirname, '../../src/data/eBird_taxonomy_v2025.csv');
const DEFAULT_CACHE_ROOT = path.resolve(__dirname, '../../image-cache');
const DEFAULT_APP_IMAGE_OUTPUT = path.resolve(__dirname, '../../src/data/species-images-pipeline.json');
const DEFAULT_APP_IMAGE_BASE = path.resolve(__dirname, '../../src/data/species-images-2025.json');
const DEFAULT_APP_IMAGE_MERGED = path.resolve(__dirname, '../../src/data/species-images-merged.json');

const parseArgs = (argv) => {
    const args = {
        _: []
    };

    for (let i = 0; i < argv.length; i++) {
        const token = argv[i];
        if (!token.startsWith('--')) {
            args._.push(token);
            continue;
        }

        const key = token.slice(2);
        const next = argv[i + 1];
        if (!next || next.startsWith('--')) {
            args[key] = true;
            continue;
        }

        args[key] = next;
        i++;
    }

    return args;
};

const printHelp = () => {
    console.log(`BirdMap Explorer image pipeline

Usage:
  node tools/image-pipeline/cli.js collect --species <code> [--limit 8] [--providers inaturalist,gbif,wikimedia] [--refresh]
  node tools/image-pipeline/cli.js score --mock --species <code>
  node tools/image-pipeline/cli.js approve --species <code> --candidate <candidateId> [--status manual_approved]
  node tools/image-pipeline/cli.js reject --species <code> --candidate <candidateId>
  node tools/image-pipeline/cli.js materialize [--species <code> | --family <name> | --all]
  node tools/image-pipeline/cli.js review [--port 4173]
  node tools/image-pipeline/cli.js generate-catalog [--species <code> | --family <name> | --all]
  node tools/image-pipeline/cli.js export-app-images [--output src/data/species-images-pipeline.json] [--asset-base-path image-cache] [--include-remote-approved]
  node tools/image-pipeline/cli.js merge-app-images [--base src/data/species-images-2025.json] [--overlay src/data/species-images-pipeline.json] [--output src/data/species-images-merged.json]

Options:
  --taxonomy <path>     eBird taxonomy CSV. Defaults to src/data/eBird_taxonomy_v2025.csv
  --cache-root <path>   Pipeline cache root. Defaults to image-cache
  --max-species <n>     Safety cap for --family or --all runs
`);
};

const loadScopedSpecies = (args) => {
    const taxonomyPath = path.resolve(args.taxonomy ?? DEFAULT_TAXONOMY);
    if (!existsSync(taxonomyPath)) {
        throw new Error(`Taxonomy CSV not found: ${taxonomyPath}`);
    }

    let selected = selectSpecies(loadSpecies(taxonomyPath), args);
    if (args['max-species']) {
        selected = selected.slice(0, Number(args['max-species']));
    }
    return selected;
};

const collect = async (args) => {
    const cacheRoot = path.resolve(args['cache-root'] ?? DEFAULT_CACHE_ROOT);
    const limit = Number(args.limit ?? 8);
    const providers = getProviders(args.providers);
    const speciesList = loadScopedSpecies(args);

    for (const species of speciesList) {
        const existing = readCandidates(cacheRoot, species.speciesCode);
        if (existing && !args.refresh) {
            console.log(`${species.speciesCode}: using cached candidates (${existing.length})`);
            continue;
        }

        const allCandidates = [];
        for (const provider of providers) {
            try {
                const candidates = await provider.searchSpecies(species, {limit});
                console.log(`${species.speciesCode}: ${provider.name} returned ${candidates.length}`);
                allCandidates.push(...candidates);
            } catch (error) {
                console.warn(`${species.speciesCode}: ${provider.name} failed: ${error.message}`);
            }
        }

        const filtered = filterDisallowedCandidates(allCandidates);
        if (filtered.removed.length) {
            console.log(`${species.speciesCode}: removed ${filtered.removed.length} candidates with disallowed attributes`);
        }

        writeCandidates(cacheRoot, species.speciesCode, filtered.kept);
    }
};

const score = async (args) => {
    if (!args.mock) {
        throw new Error('Only --mock scoring is implemented in increment 1');
    }

    const cacheRoot = path.resolve(args['cache-root'] ?? DEFAULT_CACHE_ROOT);
    const speciesList = loadScopedSpecies(args);

    for (const species of speciesList) {
        const candidates = readCandidates(cacheRoot, species.speciesCode);
        if (!candidates) {
            console.warn(`${species.speciesCode}: no cached candidates`);
            continue;
        }

        const filtered = filterDisallowedCandidates(candidates);
        if (filtered.removed.length) {
            console.log(`${species.speciesCode}: removed ${filtered.removed.length} cached candidates with disallowed attributes`);
        }

        const scored = filtered.kept
            .map(candidate => ({
                ...candidate,
                evaluation: scoreCandidate(candidate)
            }))
            .sort((a, b) => b.evaluation.score - a.evaluation.score);

        writeCandidates(cacheRoot, species.speciesCode, scored);
        console.log(`${species.speciesCode}: scored ${scored.length} candidates`);
    }
};

const approve = async (args) => {
    if (!args.species || !args.candidate) {
        throw new Error('approve requires --species <code> and --candidate <candidateId>');
    }

    const cacheRoot = path.resolve(args['cache-root'] ?? DEFAULT_CACHE_ROOT);
    const candidates = readCandidates(cacheRoot, args.species) ?? [];
    const candidate = candidates.find(candidate => candidate.id === args.candidate);
    if (!candidate) {
        throw new Error(`Candidate "${args.candidate}" was not found for ${args.species}`);
    }

    const reviewState = readReviewState(cacheRoot);
    reviewState.decisions[args.species] = {
        status: args.status ?? 'manual_approved',
        candidateId: args.candidate,
        crop: null,
        updatedAt: new Date().toISOString()
    };
    writeReviewState(cacheRoot, reviewState);
    console.log(`${args.species}: approved ${args.candidate}`);
};

const reject = async (args) => {
    if (!args.species || !args.candidate) {
        throw new Error('reject requires --species <code> and --candidate <candidateId>');
    }

    const cacheRoot = path.resolve(args['cache-root'] ?? DEFAULT_CACHE_ROOT);
    const reviewState = readReviewState(cacheRoot);
    const existing = reviewState.decisions[args.species] ?? {};
    reviewState.decisions[args.species] = {
        ...existing,
        rejectedCandidateIds: Array.from(new Set([...(existing.rejectedCandidateIds ?? []), args.candidate])),
        status: existing.status ?? 'needs_review',
        updatedAt: new Date().toISOString()
    };
    writeReviewState(cacheRoot, reviewState);
    console.log(`${args.species}: rejected ${args.candidate}`);
};

const materialize = async (args) => {
    const cacheRoot = path.resolve(args['cache-root'] ?? DEFAULT_CACHE_ROOT);
    const speciesList = loadScopedSpecies(args);

    for (const species of speciesList) {
        const result = await materializeSpecies(cacheRoot, species);
        if (result.skipped) {
            console.warn(`${species.speciesCode}: skipped (${result.reason})`);
            continue;
        }

        console.log(`${species.speciesCode}: materialized ${result.candidateId}`);
    }
};

const run = async () => {
    const args = parseArgs(process.argv.slice(2));
    const command = args._[0];

    if (!command || args.help) {
        printHelp();
        return;
    }

    if (command === 'collect') {
        await collect(args);
    } else if (command === 'score') {
        await score(args);
    } else if (command === 'approve') {
        await approve(args);
    } else if (command === 'reject') {
        await reject(args);
    } else if (command === 'materialize') {
        await materialize(args);
    } else if (command === 'review') {
        const cacheRoot = path.resolve(args['cache-root'] ?? DEFAULT_CACHE_ROOT);
        const taxonomyPath = path.resolve(args.taxonomy ?? DEFAULT_TAXONOMY);
        const {url} = await startReviewServer({
            cacheRoot,
            taxonomyPath,
            port: args.port ?? 4173
        });
        console.log(`review: ${url}`);
    } else if (command === 'generate-catalog') {
        const cacheRoot = path.resolve(args['cache-root'] ?? DEFAULT_CACHE_ROOT);
        const catalog = generateCatalog(cacheRoot, loadScopedSpecies(args));
        console.log(`catalog: wrote ${catalog.entries.length} entries`);
    } else if (command === 'export-app-images') {
        const result = exportAppImages({
            cacheRoot: path.resolve(args['cache-root'] ?? DEFAULT_CACHE_ROOT),
            taxonomyPath: path.resolve(args.taxonomy ?? DEFAULT_TAXONOMY),
            outputPath: path.resolve(args.output ?? DEFAULT_APP_IMAGE_OUTPUT),
            assetBasePath: args['asset-base-path'] ?? 'image-cache',
            includeRemoteApproved: Boolean(args['include-remote-approved'])
        });
        console.log(`app images: exported ${result.exportedCount} approved images to ${result.outputPath}`);
        if (result.skippedUnmaterialized) {
            console.log(`app images: skipped ${result.skippedUnmaterialized} approved images without local materialized files`);
        }
    } else if (command === 'merge-app-images') {
        const result = mergeAppImages({
            basePath: path.resolve(args.base ?? DEFAULT_APP_IMAGE_BASE),
            overlayPath: path.resolve(args.overlay ?? DEFAULT_APP_IMAGE_OUTPUT),
            outputPath: path.resolve(args.output ?? DEFAULT_APP_IMAGE_MERGED)
        });
        console.log(`merged images: ${result.baseCount} base + ${result.overlayCount} overlay -> ${result.mergedCount} entries`);
        console.log(`merged images: replaced ${result.replacedCount} base entries`);
    } else {
        throw new Error(`Unknown command "${command}"`);
    }
};

run().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
});
