# BirdMap Explorer Image Pipeline

This is increment 1 of the reusable image acquisition pipeline. It collects
candidate image metadata, caches provider responses in a normalized shape,
applies a mock scorer, records review decisions, and writes a catalog.

Implemented providers:

- `inaturalist`
- `gbif`
- `wikimedia`

Not implemented yet:

- real AI vision scoring
- subject detection and crop metadata

## Cache Layout

Generated files are written under `image-cache/` by default:

```text
image-cache/
  source_candidates/
    {speciesCode}/
      candidates.json
  review_state.json
  catalog.json
  approved/
    {speciesCode}/
      original.jpg
      512.jpg
      256.jpg
      full640.jpg
      meta.json
```

The cache is ignored by git. Normal collection runs reuse existing cached
candidate files. Pass `--refresh` to re-query providers for a species or scope.

## Commands

Collect candidates for one species:

```bash
npm run imagePipeline -- collect --species norcar --limit 8
```

Collect from selected providers:

```bash
npm run imagePipeline -- collect --species norcar --providers inaturalist,gbif
```

Score cached candidates with the mock scorer:

```bash
npm run imagePipeline -- score --mock --species norcar
```

Approve a candidate:

```bash
npm run imagePipeline -- approve --species norcar --candidate inaturalist:abc123
```

Reject a candidate:

```bash
npm run imagePipeline -- reject --species norcar --candidate inaturalist:abc123
```

Generate a catalog:

```bash
npm run imagePipeline -- generate-catalog --species norcar
```

Materialize the approved image for a species:

```bash
npm run imagePipeline -- materialize --species norcar
```

This downloads the approved original once and generates 4:3 `512.jpg` and
`256.jpg` files from the current crop metadata, plus `full640.jpg` resized to
640 pixels on the longer edge while preserving the original image proportions.
Increment 2 uses a centered 4:3 crop by default; later review tooling will make
this editable.

Start the local review app:

```bash
npm run imagePipeline -- review
```

The review app opens at `http://127.0.0.1:4173/` by default. It shows species
with cached candidates and lets you approve, reject, materialize, adjust the
4:3 crop, and regenerate the catalog for the selected species.

Export approved images for app consumption:

```bash
npm run imagePipeline -- export-app-images
```

This regenerates a full `image-cache/catalog.json` from all review decisions and
writes `src/data/species-images-pipeline.json`, keyed by eBird taxonomic order.
Entries include `thumb`, `medium`, `full640`, attribution, source, license, and
species metadata. Full-size originals stay in the local image cache for review
and rematerialization, but are not exported for app consumption. By default,
only materialized approved images are exported so the app file points at local
pipeline assets. Pass `--include-remote-approved` to also include approved
candidates that have not been materialized yet.

Regenerate taxonomy data with the merged image file:

```bash
npm run generateData
```

`generateData` runs `export-app-images`, then `merge-app-images`, then regenerates
the taxonomy data with `src/data/species-images-merged.json`. Pipeline entries
win when both files contain the same taxonomic order.

To regenerate taxonomy data with only the legacy `src/data/species-images-2025.json`
file, run:

```bash
npm run generateDataLegacy
```

For broader runs, use a safety cap while testing:

```bash
npm run imagePipeline -- collect --family Cardinalidae --max-species 5
npm run imagePipeline -- generate-catalog --all --max-species 25
```

## Candidate Shape

Each provider returns normalized candidates with:

- `id`
- `speciesCode`
- `source`
- `sourceUrl`
- `imageUrl`
- `thumbnailUrl`
- `photographer`
- `license`
- `attribution`
- `originalWidth`
- `originalHeight`
- `providerRank`
- `retrievedAt`
- `raw`

The `raw` field intentionally preserves provider-specific IDs needed for later
debugging and deduplication.
