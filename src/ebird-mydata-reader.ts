import * as JSZip from "jszip";
import * as Papa from "papaparse";
import * as taxonomyRanged from './data/ranged-taxonomy.json';
import * as taxonomyFamily from './data/family-taxonomy.json';
import * as emptyChecklist from './data/empty-checklist.json';
import * as speciesTaxonomy from './data/species-taxonomy.json';

const CSV_FILENAME = 'MyEBirdData.csv';
const DEFAULT_BOOKMARKLET_START_YEAR = 2020;

export const isSpeciesLevelObservation = (row: EBirdMyDataSchema): boolean => {
    const scientificName = row.scientificName ?? '';
    const speciesLevelName = scientificName.split(' ').slice(0, 2).join(' ');
    return scientificName.indexOf('sp.') < 0
        && speciesLevelName.indexOf('/') < 0
        && scientificName.indexOf(' x ') < 0
        && !scientificName.match(/\(domestic/i);
}

/**
 * @deprecated Use isSpeciesLevelObservation. This helper only detects species-level observation rows;
 * it does not reflect eBird's scoped Countable value.
 */
export const isCountableSpeciesObservation = isSpeciesLevelObservation;

export const isValidObservation = (row: EBirdMyDataSchema): boolean => {
    if (!row) return false;
    return !!row.date
        && !!row.commonName
        && !!row.scientificName
        && !!row.taxonomicOrder;
}

export const generateBookmarklet = (startYear = DEFAULT_BOOKMARKLET_START_YEAR): string => {
    const currentYear = new Date().getFullYear();
    if (!Number.isInteger(startYear) || startYear < 1900 || startYear > currentYear) {
        throw new RangeError(`startYear must be an integer between 1900 and ${currentYear}`);
    }

    return `javascript:
(async () => {
    const region = "world";
    const startYear = ${startYear};
    const endYear = new Date().getFullYear();
    const years = Array.from({length: endYear - startYear + 1}, (_, i) => startYear + i);
    if (!location.hostname.endsWith("ebird.org")) {
        alert("Open eBird.org while logged in, then click this bookmarklet.");
        return;
    }
    const fetchCsv = async (url) => {
        const response = await fetch(url, {credentials: "include"});
        const text = await response.text();
        if (!response.ok) throw new Error(response.status + " " + url);
        if (text.trim().startsWith("<")) throw new Error("Expected CSV but got HTML for " + url + ". Are you logged in?");
        return text;
    };
    const parseCsv = (text) => {
        const rows = [];
        let row = [];
        let field = "";
        let quoted = false;
        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            const next = text[i + 1];
            if (quoted) {
                if (char === '"' && next === '"') {
                    field += '"';
                    i++;
                } else if (char === '"') {
                    quoted = false;
                } else {
                    field += char;
                }
            } else if (char === '"') {
                quoted = true;
            } else if (char === ",") {
                row.push(field);
                field = "";
            } else if (char === "\\n") {
                row.push(field);
                rows.push(row);
                row = [];
                field = "";
            } else if (char !== "\\r") {
                field += char;
            }
        }
        if (field.length || row.length) {
            row.push(field);
            rows.push(row);
        }
        return rows.filter((csvRow) => csvRow.some((value) => value.trim()));
    };
    const getValue = (row, headers, name) => row[headers.indexOf(name)] || "";
    const summarizeExport = async ({scope, year, url}) => {
        const csv = await fetchCsv(url);
        const parsed = parseCsv(csv);
        const headers = parsed.shift();
        if (!headers) throw new Error("No CSV headers for " + url);
        const requiredColumns = ["Taxon Order", "Category", "Common Name", "Scientific Name", "Count", "Location", "S/P", "Date", "LocID", "SubID", "Exotic", "Countable"];
        const missingColumns = requiredColumns.filter((column) => !headers.includes(column));
        if (missingColumns.length) throw new Error("Missing CSV columns for " + url + ": " + missingColumns.join(", "));
        const rows = parsed.map((row) => {
            const category = getValue(row, headers, "Category");
            const countable = getValue(row, headers, "Countable").trim() === "1";
            const exotic = getValue(row, headers, "Exotic").trim();
            return {
                taxonOrder: Number(getValue(row, headers, "Taxon Order")),
                category,
                commonName: getValue(row, headers, "Common Name"),
                scientificName: getValue(row, headers, "Scientific Name"),
                count: getValue(row, headers, "Count") || null,
                location: getValue(row, headers, "Location") || null,
                stateProvince: getValue(row, headers, "S/P") || null,
                date: getValue(row, headers, "Date") || null,
                locationId: getValue(row, headers, "LocID") || null,
                submissionId: getValue(row, headers, "SubID") || null,
                exotic: exotic || null,
                countable
            };
        }).filter((row) => Number.isFinite(row.taxonOrder));
        const speciesRows = rows.filter((row) => row.category === "species");
        const countableTaxa = speciesRows
            .filter((row) => row.countable)
            .map((row) => ({
                taxonOrder: row.taxonOrder,
                submissionId: row.submissionId,
                locationId: row.locationId,
                date: row.date
            }));
        return {
            scope,
            year,
            region,
            url: "https://ebird.org" + url,
            downloadedAt: new Date().toISOString(),
            rowCount: rows.length,
            speciesCount: speciesRows.length,
            countableSpeciesCount: countableTaxa.length,
            countableTaxa,
            taxa: rows.filter((row) => row.category !== "species" || !row.countable || row.exotic)
        };
    };
    try {
        const exports = [];
        exports.push(await summarizeExport({scope: "life", url: "/lifelist?r=" + region + "&fmt=csv"}));
        for (const year of years) {
            exports.push(await summarizeExport({scope: "year", year, url: "/lifelist?r=" + region + "&time=year&year=" + year + "&fmt=csv"}));
        }
        const bundle = {
            schemaVersion: 3,
            source: "ebird-list-countability",
            region,
            generatedAt: new Date().toISOString(),
            exports
        };
        const blob = new Blob([JSON.stringify(bundle, null, 2)], {type: "application/json"});
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = "bme-ebird-list-countability-" + region + "-v3-" + new Date().toISOString().slice(0, 10) + ".json";
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    } catch (error) {
        console.error(error);
        alert("Unable to build BME eBird countability bundle: " + error.message);
    }
})();`;
}

const normalizeObservation = (row: EBirdMyDataSchema): EBirdMyDataSchema => {
    if (!row) return row;
    const submissionId = row.submissionId ?? row.submissionID;
    row.submissionId = submissionId;
    row.submissionID = submissionId;
    return row;
}

/**
 * Represents a single observation of one species in eBird
 */
export type EBirdMyDataSchema = {
    submissionId: string,
    submissionID?: string,
    commonName: string,
    scientificName: string,
    taxonomicOrder: number,
    count: number|string,
    stateProvince: string,
    county: string,
    locationId: string,
    location: string,
    latitude: number,
    longitude: number,
    date: string,
    time: string,
    protocol: string,
    durationMin: number,
    allObsReported: number,
    distanceTraveledKm: number,
    areaCoveredHa: number,
    numberOfObservers: number,
    breedingCode: string,
    observationDetails: string,
    checklistComments: string,
    mlCatalogNumbers: string,
    observedYear?: number,
    observedMonth?: number,
    baseScientificName?: string,
    canonicalTaxonomicOrder?: number,
    reportAsTaxonomicOrder?: number,
    reportAsCommonName?: string,
    reportAsScientificName?: string,
    isLifer?: boolean,
    isFirstOfYear?: boolean
}

/**
 * An object containing all of a user's observations for a single species
 */
export type EBirdObservationsBySpecies = {
    taxonomicOrder: number,
    commonName: string,
    observations: EBirdMyDataSchema[]
}

/**
 * An object containing all of a user's observations for a taxonomical family
 */
export type EBirdObservationsByFamily = {
    familyName: string,
    familyScientific?: string,
    familyCommon?: string,
    observations: EBirdMyDataSchema[]
}

export type EBirdChecklistByFamily = {
    familyName: string,
    familyScientific: string,
    familyCommon: string,
    seen: boolean,
    totalCount: number,
    seenCount: number,
    speciesList: EBirdChecklistBySpecies[],
    firstObservation: EBirdMyDataSchema
}

export type EBirdChecklistBySpecies = {
    taxonomicOrder: number,
    scientificName: string,
    commonName: string,
    speciesCode: string,
    alternateSpeciesCodes: string[],
    alternateTaxonomicOrders?: number[],
    familyScientific: string,
    familyCommon: string,
    isExtinct: boolean,
    range: string,
    seen: boolean,
    firstObservation: EBirdMyDataSchema,
    image?: EBirdChecklistSpeciesImage
}

export type EBirdChecklistSpeciesImage = {
    thumb?: string,
    medium?: string,
    full640?: string,
    meta?: string,
    source?: string,
    sourceUrl?: string,
    photographer?: string,
    license?: string,
    attribution?: string,
    speciesCode?: string,
    commonName?: string,
    scientificName?: string
}

/**
 * An object containing all of a user's observations for a single location
 */
export type EBirdObservationsByLocation = {
    locationId: string,
    location: string,
    observations: EBirdMyDataSchema[]
}

export type EBirdCountabilityTaxon = {
    taxonOrder: number,
    category?: string,
    commonName?: string,
    scientificName?: string,
    count?: number|string,
    location?: string,
    stateProvince?: string,
    date?: string,
    locationId?: string,
    submissionId?: string,
    exotic?: string,
    countable?: boolean
}

export type EBirdCountabilityBundleExport = {
    scope: 'life' | 'year',
    year?: number,
    region: string,
    url?: string,
    downloadedAt?: string,
    rowCount?: number,
    speciesCount?: number,
    countableSpeciesCount: number,
    countableTaxa: EBirdCountabilityTaxon[],
    taxa: EBirdCountabilityTaxon[]
}

export type EBirdCountabilityBundle = {
    schemaVersion: number,
    source: string,
    region: string,
    generatedAt?: string,
    exports: EBirdCountabilityBundleExport[]
}

export type EBirdSightingsCalibrationDiagnostic = {
    code: string,
    message: string,
    scope?: 'life' | 'year',
    year?: number,
    severity?: 'info' | 'warning' | 'error'
}

export type EBirdCountabilityScope = EBirdCountabilityBundleExport & {
    countableTaxonOrders: Set<number>,
    nonCountableTaxonOrders: Set<number>,
    countableObservationKeys: Set<string>
}

export type EBirdCountabilityCalibration = {
    schemaVersion: 3,
    source: string,
    region: string,
    generatedAt?: string,
    life?: EBirdCountabilityScope,
    years: Record<string, EBirdCountabilityScope>,
    diagnostics: EBirdSightingsCalibrationDiagnostic[]
}

export type EBirdObservationCalibration = {
    source: 'list-export',
    scope: 'life' | 'year',
    year?: number,
    taxonOrder: number,
    countableSpecies: boolean,
    countableRepresentative: boolean,
    matchedBy?: 'submission-canonical' | 'canonical-fallback',
    exotic?: string,
    category?: string,
    listEntry?: EBirdCountabilityTaxon
}

export type EBirdCalibratedObservation = EBirdMyDataSchema & {
    calibration?: {
        life?: EBirdObservationCalibration,
        years?: Record<string, EBirdObservationCalibration>
    }
}

export type EBirdCalibratedScope = {
    scope: 'life' | 'year',
    year?: number,
    region: string,
    countableSpeciesCount: number,
    countableTaxonOrders: Set<number>,
    countableObservations: EBirdCalibratedObservation[],
    diagnostics: EBirdSightingsCalibrationDiagnostic[]
}

export type EBirdSightingsCalibrationResult = {
    observations: EBirdCalibratedObservation[],
    life?: EBirdCalibratedScope,
    years: Record<string, EBirdCalibratedScope>,
    diagnostics: EBirdSightingsCalibrationDiagnostic[]
}

const columnTransforms = {
    "Submission ID": "submissionId",
    "Common Name": "commonName",
    "Scientific Name": "scientificName",
    "Taxonomic Order": "taxonomicOrder",
    "Count": "count",
    "State/Province": "stateProvince",
    "County": "county",
    "Location ID": "locationId",
    "Location": "location",
    "Latitude": "latitude",
    "Longitude": "longitude",
    "Date": "date",
    "Time": "time",
    "Protocol": "protocol",
    "Duration (Min)": "durationMin",
    "All Obs Reported": "allObsReported",
    "Distance Traveled (km)": "distanceTraveledKm",
    "Area Covered (ha)": "areaCoveredHa",
    "Number of Observers": "numberOfObservers",
    "Breeding Code": "breedingCode",
    "Observation Details": "observationDetails",
    "Checklist Comments": "checklistComments",
    "ML Catalog Numbers": "mlCatalogNumbers"
};

const headerTransformFunction = (col) => {
    if (columnTransforms.hasOwnProperty(col)) {
        return columnTransforms[col];
    }

    return col;
}

/**
 * Loads an eBird "My Data" ZIP file and extracts the CSV data, returning it as a string
 * @param {string|ArrayBuffer|Buffer} dataFile
 * @returns Promise<string>
 */
export const loadDataFile = async (dataFile: string | ArrayBuffer | Buffer): Promise<string> => {
    // console.log('Loading eBird data from ZIP file');
    const zip = new JSZip();

    const zipFile = await zip.loadAsync(dataFile);
    const csvFile = zipFile.file(CSV_FILENAME);
    if (csvFile) {
        const csvData = await csvFile.async('string');
        return csvData;
    }

    return null;
}

/**
 * Parses a string containing eBird observations in CSV format and returns an array of enriched data objects
 * @param {string} csvData
 * @returns EBirdMyDataSchema[]
 */
export const parseData = (csvData: string): EBirdMyDataSchema[] => {
    console.log('Parsing eBird CSV data');
    const options = {
        header: true,
        transformHeader: headerTransformFunction,
        dynamicTyping: true,
        skipEmptyLines: 'greedy'
    }

    const jsonData = Papa.parse(csvData, options);

    return annotateData(jsonData.data);
}

const getCalibrationObservationKey = (submissionId: string, taxonOrder: number): string => {
    return `${submissionId}:${taxonOrder}`;
}

const normalizeCountabilityTaxon = (taxon: EBirdCountabilityTaxon): EBirdCountabilityTaxon => {
    const taxonOrder = Number(taxon?.taxonOrder);
    return {
        ...taxon,
        taxonOrder,
        submissionId: taxon?.submissionId || null,
        locationId: taxon?.locationId || null,
        date: taxon?.date || null,
        exotic: taxon?.exotic || null
    };
}

const parseCountabilityScope = (rawScope: EBirdCountabilityBundleExport): EBirdCountabilityScope => {
    const countableTaxa = (rawScope.countableTaxa ?? [])
        .map(normalizeCountabilityTaxon)
        .filter((taxon) => Number.isFinite(taxon.taxonOrder));
    const taxa = (rawScope.taxa ?? [])
        .map(normalizeCountabilityTaxon)
        .filter((taxon) => Number.isFinite(taxon.taxonOrder));

    return {
        ...rawScope,
        countableTaxa,
        taxa,
        countableTaxonOrders: new Set(countableTaxa.map((taxon) => taxon.taxonOrder)),
        nonCountableTaxonOrders: new Set(
            taxa
                .filter((taxon) => taxon.category === 'species' && taxon.countable === false)
                .map((taxon) => taxon.taxonOrder)
        ),
        countableObservationKeys: new Set(
            countableTaxa
                .filter((taxon) => !!taxon.submissionId)
                .map((taxon) => getCalibrationObservationKey(taxon.submissionId, taxon.taxonOrder))
        )
    };
}

export const parseCountabilityBundle = (bundleInput: string | EBirdCountabilityBundle): EBirdCountabilityCalibration => {
    const bundle = typeof bundleInput === 'string' ? JSON.parse(bundleInput) : bundleInput;
    if (!bundle || bundle.schemaVersion !== 3 || bundle.source !== 'ebird-list-countability') {
        throw new Error('Expected an eBird countability bundle with schemaVersion 3');
    }
    if (!Array.isArray(bundle.exports)) {
        throw new Error('Expected an eBird countability bundle with an exports array');
    }

    const diagnostics: EBirdSightingsCalibrationDiagnostic[] = [];
    const calibration: EBirdCountabilityCalibration = {
        schemaVersion: 3,
        source: bundle.source,
        region: bundle.region,
        generatedAt: bundle.generatedAt,
        years: {},
        diagnostics
    };

    for (const rawScope of bundle.exports) {
        if (rawScope.scope !== 'life' && rawScope.scope !== 'year') {
            diagnostics.push({
                code: 'unknown-scope',
                message: `Skipping unsupported countability scope: ${rawScope.scope}`,
                severity: 'warning'
            });
            continue;
        }

        if (rawScope.scope === 'year' && !Number.isInteger(rawScope.year)) {
            diagnostics.push({
                code: 'missing-year',
                message: 'Skipping year countability scope without a numeric year',
                scope: 'year',
                severity: 'warning'
            });
            continue;
        }

        const scope = parseCountabilityScope(rawScope);
        if (scope.scope === 'life') {
            if (calibration.life) {
                diagnostics.push({
                    code: 'duplicate-life-scope',
                    message: 'Duplicate life countability scope found; using the last one',
                    scope: 'life',
                    severity: 'warning'
                });
            }
            calibration.life = scope;
        } else {
            const yearKey = scope.year.toString();
            if (calibration.years[yearKey]) {
                diagnostics.push({
                    code: 'duplicate-year-scope',
                    message: `Duplicate year countability scope found for ${yearKey}; using the last one`,
                    scope: 'year',
                    year: scope.year,
                    severity: 'warning'
                });
            }
            calibration.years[yearKey] = scope;
        }
    }

    return calibration;
}

/**
 * Accepts an array of eBird observation objects and calculates additional information including the observed year and month,
 * the base scientific name (without subspecies), and whether the bird is the first observation ever for a user (a "lifer"),
 * or the first observation in a calendar year
 * @param {EBirdMyDataSchema[]} rawData
 */
export const annotateData = (rawData: EBirdMyDataSchema[]): EBirdMyDataSchema[] => {
    let sortedObservations = rawData.map(normalizeObservation).filter(isValidObservation).sort((a, b) => {
        const timestampA = getObservationTimestamp(a);
        const timestampB = getObservationTimestamp(b);

        if (timestampA < timestampB) return -1;
        if (timestampA > timestampB) return 1;
        if (timestampA === timestampB) {
            if (a.taxonomicOrder < b.taxonomicOrder) return -1;
            if (a.taxonomicOrder > b.taxonomicOrder) return 1;
            return 0;
        }
    });

    const seenCanonicalTaxonomicOrders = new Set<number>();
    const seenCanonicalTaxonomicOrderYears = new Set<string>();

    sortedObservations.forEach((obs: EBirdMyDataSchema) => {
        if (!obs.date) return;

        const dateSplit = obs.date.split('-');
        if (dateSplit.length === 3) {
            obs.observedYear = parseInt(dateSplit[0]);
            obs.observedMonth = parseInt(dateSplit[1]);
        }

        const scientificNameSegments = obs.scientificName.split(' ');
        if (scientificNameSegments.length >= 2) {
            obs.baseScientificName = `${scientificNameSegments[0]} ${scientificNameSegments[1]}`;
        } else {
            obs.baseScientificName = obs.scientificName;
        }

        obs.canonicalTaxonomicOrder = getCanonicalTaxonomicOrder(obs.taxonomicOrder);
        const reportAs = getSpeciesReportMetadata(obs.taxonomicOrder);
        if (reportAs) {
            obs.reportAsTaxonomicOrder = reportAs.order;
            obs.reportAsCommonName = reportAs.commonName;
            obs.reportAsScientificName = reportAs.scientificName;
        }

        obs.isLifer = !seenCanonicalTaxonomicOrders.has(obs.canonicalTaxonomicOrder);
        seenCanonicalTaxonomicOrders.add(obs.canonicalTaxonomicOrder);

        const taxonYearKey = `${obs.canonicalTaxonomicOrder}:${obs.observedYear}`;
        obs.isFirstOfYear = !seenCanonicalTaxonomicOrderYears.has(taxonYearKey);
        seenCanonicalTaxonomicOrderYears.add(taxonYearKey);

    });

    return sortedObservations;
}

const getCalibrationForObservation = (
    scope: EBirdCountabilityScope,
    observation: EBirdCalibratedObservation
): EBirdObservationCalibration | null => {
    const taxonOrder = observation.canonicalTaxonomicOrder;
    if (!taxonOrder) return null;

    const countableSpecies = scope.countableTaxonOrders.has(taxonOrder);
    const nonCountableSpecies = scope.nonCountableTaxonOrders.has(taxonOrder);
    if (!countableSpecies && !nonCountableSpecies) return null;

    const exactTaxon = scope.taxa.find((taxon) => {
        return taxon.submissionId === observation.submissionId && taxon.taxonOrder === taxonOrder;
    });
    const taxonExplanation = exactTaxon ?? scope.taxa.find((taxon) => taxon.taxonOrder === taxonOrder);

    return {
        source: 'list-export',
        scope: scope.scope,
        year: scope.year,
        taxonOrder,
        countableSpecies,
        countableRepresentative: false,
        exotic: taxonExplanation?.exotic,
        category: taxonExplanation?.category,
        listEntry: taxonExplanation
    };
}

const setObservationCalibration = (
    observation: EBirdCalibratedObservation,
    calibration: EBirdObservationCalibration
) => {
    if (!observation.calibration) {
        observation.calibration = {};
    }

    if (calibration.scope === 'life') {
        observation.calibration.life = calibration;
        return;
    }

    if (!observation.calibration.years) {
        observation.calibration.years = {};
    }
    observation.calibration.years[calibration.year.toString()] = calibration;
}

const getObservationCalibration = (
    observation: EBirdCalibratedObservation,
    scope: EBirdCountabilityScope
): EBirdObservationCalibration | null => {
    if (scope.scope === 'life') {
        return observation.calibration?.life ?? null;
    }

    return observation.calibration?.years?.[scope.year.toString()] ?? null;
}

const calibrateScope = (
    scope: EBirdCountabilityScope,
    observations: EBirdCalibratedObservation[],
    observationsByKey: Map<string, EBirdCalibratedObservation[]>
): EBirdCalibratedScope => {
    const diagnostics: EBirdSightingsCalibrationDiagnostic[] = [];
    const scopedObservations = observations.filter((observation) => {
        return scope.scope === 'life' || observation.observedYear === scope.year;
    });

    scopedObservations.forEach((observation) => {
        const calibration = getCalibrationForObservation(scope, observation);
        if (calibration) {
            setObservationCalibration(observation, calibration);
        }
    });

    const countableObservations: EBirdCalibratedObservation[] = [];
    const seenTaxonOrders = new Set<number>();

    scope.countableTaxa.forEach((taxon) => {
        if (seenTaxonOrders.has(taxon.taxonOrder)) {
            diagnostics.push({
                code: 'duplicate-countable-taxon',
                message: `Duplicate countable taxon ${taxon.taxonOrder} in ${scope.scope}${scope.year ? ` ${scope.year}` : ''}`,
                scope: scope.scope,
                year: scope.year,
                severity: 'warning'
            });
            return;
        }
        seenTaxonOrders.add(taxon.taxonOrder);

        const exactKey = taxon.submissionId
            ? getCalibrationObservationKey(taxon.submissionId, taxon.taxonOrder)
            : null;
        let matchedObservation = exactKey ? observationsByKey.get(exactKey)?.[0] : null;
        let matchedBy: EBirdObservationCalibration['matchedBy'] = matchedObservation
            ? 'submission-canonical'
            : null;

        if (!matchedObservation) {
            matchedObservation = scopedObservations.find((observation) => {
                return observation.canonicalTaxonomicOrder === taxon.taxonOrder;
            });
            matchedBy = matchedObservation ? 'canonical-fallback' : null;

            diagnostics.push({
                code: matchedObservation ? 'countable-taxon-fallback' : 'countable-taxon-unmatched',
                message: matchedObservation
                    ? `Matched countable taxon ${taxon.taxonOrder} by canonical taxon only`
                    : `Unable to match countable taxon ${taxon.taxonOrder} to an observation`,
                scope: scope.scope,
                year: scope.year,
                severity: matchedObservation ? 'warning' : 'error'
            });
        }

        if (!matchedObservation) return;

        const existingCalibration = getObservationCalibration(matchedObservation, scope);
        const representativeCalibration: EBirdObservationCalibration = {
            ...(existingCalibration ?? {
                source: 'list-export',
                scope: scope.scope,
                year: scope.year,
                taxonOrder: taxon.taxonOrder,
                countableSpecies: true,
                countableRepresentative: false
            }),
            countableSpecies: true,
            countableRepresentative: true,
            matchedBy,
            listEntry: taxon
        };
        setObservationCalibration(matchedObservation, representativeCalibration);
        countableObservations.push(matchedObservation);
    });

    return {
        scope: scope.scope,
        year: scope.year,
        region: scope.region,
        countableSpeciesCount: scope.countableSpeciesCount,
        countableTaxonOrders: scope.countableTaxonOrders,
        countableObservations: countableObservations.sort(ebirdSortFunction),
        diagnostics
    };
}

export const calibrateSightings = (
    annotatedData: EBirdMyDataSchema[],
    calibration: EBirdCountabilityCalibration
): EBirdSightingsCalibrationResult => {
    const calibratedObservations: EBirdCalibratedObservation[] = annotatedData.map((observation) => ({
        ...observation
    }));
    const observationsByKey = new Map<string, EBirdCalibratedObservation[]>();

    calibratedObservations.forEach((observation) => {
        if (!observation.submissionId || !observation.canonicalTaxonomicOrder) return;
        const key = getCalibrationObservationKey(observation.submissionId, observation.canonicalTaxonomicOrder);
        const observationsForKey = observationsByKey.get(key) ?? [];
        observationsForKey.push(observation);
        observationsByKey.set(key, observationsForKey);
    });

    const result: EBirdSightingsCalibrationResult = {
        observations: calibratedObservations,
        years: {},
        diagnostics: [...calibration.diagnostics]
    };

    if (calibration.life) {
        result.life = calibrateScope(calibration.life, calibratedObservations, observationsByKey);
        result.diagnostics.push(...result.life.diagnostics);
    }

    Object.keys(calibration.years).forEach((year) => {
        result.years[year] = calibrateScope(calibration.years[year], calibratedObservations, observationsByKey);
        result.diagnostics.push(...result.years[year].diagnostics);
    });

    return result;
}

export const getCalibratedObservations = (
    calibrationResult: EBirdSightingsCalibrationResult,
    filterYear: number | 'life'
): EBirdCalibratedObservation[] => {
    if (filterYear === 'life') {
        return calibrationResult.life?.countableObservations ?? [];
    }

    return calibrationResult.years[filterYear.toString()]?.countableObservations ?? [];
}

export const getCalibratedObservationsByTimePeriod = getCalibratedObservations;

export const getCalibratedObservationsBySpecies = (
    calibrationResult: EBirdSightingsCalibrationResult,
    filterYear: number | 'life'
): EBirdObservationsBySpecies[] => {
    const speciesList: EBirdObservationsBySpecies[] = [];

    getCalibratedObservations(calibrationResult, filterYear).forEach((observation) => {
        if (!observation.canonicalTaxonomicOrder) return;
        const reportAs = canonicalizeObservationForReporting(observation);
        const foundSpecies = speciesList.find((species) => species.taxonomicOrder === reportAs.taxonomicOrder);

        if (foundSpecies) {
            foundSpecies.observations.push(observation);
        } else {
            speciesList.push({
                taxonomicOrder: reportAs.taxonomicOrder,
                commonName: reportAs.commonName,
                observations: [observation]
            });
        }
    });

    return speciesList;
}

/**
 *
 * @param annotatedData
 * @param filterYear
 * @param filterMonth
 * @param getAllObservations
 * @returns EBirdMyDataSchema[]
 */
export const getFilteredObservations = (
    annotatedData: EBirdMyDataSchema[],
    filterYear: number | "life",
    filterMonth?: number,
    getAllObservations = false
    ): EBirdMyDataSchema[] => {
    let filteredObservations = [];
    for (let row of annotatedData) {
        if (!row.date) continue;

        const [tmpYear, tmpMonth] = row.date.split('-');
        const year = parseInt(tmpYear);
        const month = parseInt(tmpMonth);

        const yearMatches = filterYear === "life" || year === filterYear;
        const monthMatches = !filterMonth || month === filterMonth;
        if (yearMatches && monthMatches && isSpeciesLevelObservation(row)) {
            filteredObservations.push(row);
        }
    }

    /*
      With each loop, considers the previous value and does one of 3 things:
      1. If the previous value isn't an array, wraps the current item in an array and continues
         (this should only happen the first time the reducer runs)
      2. If the current value's taxonomic ID is not found in the reduced array, adds it (this should be the first
         sighting of that species for the year)
      3. If the current value's taxonomic ID is already in the reduced array, this is a repeat sighting, ignore it
    */
    const firstObservationReducer = (accumulator, current) => {
        if (!Array.isArray(accumulator)) {
            if (accumulator.canonicalTaxonomicOrder !== current.canonicalTaxonomicOrder) {
                return [accumulator, current];
            }
            return [accumulator];
        }
        const found = accumulator.findIndex(el => el.canonicalTaxonomicOrder === current.canonicalTaxonomicOrder);
        return found >= 0 ? accumulator : [...accumulator, current];
    };

    if (getAllObservations) {
        return filteredObservations.sort(ebirdSortFunction);
    } else {
        let firstObservations: EBirdMyDataSchema[] = filteredObservations.reduce(firstObservationReducer);
        if (!Array.isArray(firstObservations)) {
            firstObservations = [firstObservations];
        }
        const sortedFirstObservations = firstObservations
            .map(canonicalizeObservationForReporting)
            .sort(ebirdSortFunction);
        return sortedFirstObservations;
    }

}

/**
 *
 * @param annotatedData
 * @param filterYear
 * @returns number[]
 */
export const getMonthsWithObservations = (annotatedData: EBirdMyDataSchema[], filterYear: number | "life"): number[] => {
    annotatedData = getFilteredObservations(annotatedData, filterYear, undefined, true);

    const months = [];
    for (let row of annotatedData) {
        const month = row.observedMonth;
        if (months.indexOf(month) < 0) {
            months.push(month);
        }
    }

    return months.sort((a, b) => a - b); // Numeric sort
}

const getEBirdObservationTimestamp = (date: string, time?: string): number => {
    if (!date) {
        return Number.MAX_SAFE_INTEGER;
    }

    const normalizedTime = getNormalizedEBirdTime(time);
    const timestamp = new Date(`${date}T${normalizedTime}`).getTime();
    return isNaN(timestamp) ? Number.MAX_SAFE_INTEGER : timestamp;
}

const getNormalizedEBirdTime = (time?: string): string => {
    if (!time) {
        return '00:00';
    }

    const trimmedTime = time.trim();
    const timeParts = trimmedTime.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?$/i);
    if (!timeParts) {
        return trimmedTime;
    }

    let hours = parseInt(timeParts[1]);
    const minutes = timeParts[2];
    const seconds = timeParts[3];
    const meridiem = timeParts[4]?.toUpperCase();

    if (meridiem === 'AM' && hours === 12) {
        hours = 0;
    } else if (meridiem === 'PM' && hours < 12) {
        hours += 12;
    }

    const normalizedHours = hours < 10 ? `0${hours}` : hours.toString();
    return seconds ? `${normalizedHours}:${minutes}:${seconds}` : `${normalizedHours}:${minutes}`;
}

const ebirdSortFunction = (a, b) => {
    const dateA = getObservationTimestamp(a);
    const dateB = getObservationTimestamp(b);

    if (dateA < dateB) return -1;
    if (dateA === dateB) {
        if (a.taxonomicOrder < b.taxonomicOrder) return -1;
        if (a.taxonomicOrder > b.taxonomicOrder) return 1;
        if (a.taxonomicOrder === b.taxonomicOrder) {
            return 0;
        }
    }
    if (dateA > dateB) return 1;
    return 0;
};

const getObservationTimestamp = (observation: EBirdMyDataSchema): number => {
    return getEBirdObservationTimestamp(observation.date, observation.time);
}

/**
 *
 * @param {EBirdMyDataSchema[]} annotatedData
 * @returns EBirdObservationsBySpecies[]
 */
export const getObservationsBySpecies = (annotatedData: EBirdMyDataSchema[]): EBirdObservationsBySpecies[] => {
    const speciesList = [];

    for (const row of annotatedData) {
        if (!row.canonicalTaxonomicOrder) continue;
        if (!isSpeciesLevelObservation(row)) continue;

        const reportAs = canonicalizeObservationForReporting(row);
        const foundSpecies = speciesList.find(el => el.taxonomicOrder === reportAs.taxonomicOrder);

        if (foundSpecies) {
            foundSpecies.observations.push(reportAs);
        } else {
            speciesList.push({
                taxonomicOrder: reportAs.taxonomicOrder,
                commonName: reportAs.commonName,
                observations: [reportAs]
            })
        }
    }

    return speciesList;
}

/**
 *
 * @param {EBirdMyDataSchema[]} annotatedData
 * @returns EBirdObservationsByFamily[]
 */
export const getObservationsByFamily = (annotatedData: EBirdMyDataSchema[]): EBirdObservationsByFamily[] => {
    let taxonomy = taxonomyRanged;
    const familyList = [];

    for (const row of annotatedData) {
        if (!row.taxonomicOrder) continue;

        const foundFamily = taxonomy.find(el => row.taxonomicOrder >= el.min && row.taxonomicOrder <= el.max);
        if (!foundFamily) { continue; }

        const foundSpeciesInFamily = familyList.find(el => el.familyName === foundFamily.fam);

        if (foundSpeciesInFamily) {
            foundSpeciesInFamily.observations.push(row);
        } else {
            familyList.push({
                familyName: foundFamily.fam,
                familyScientific: foundFamily.familyScientific,
                familyCommon: foundFamily.familyCommon,
                observations: [row]
            });
        }
    }

    return familyList;
}

type SpeciesTaxonomyEntry = {
    order: number,
    family: string,
    genus: string,
    scientificName: string,
    commonName: string,
    speciesCode: string,
    alternateSpeciesCodes?: string[],
    alternateTaxonomicOrders?: number[],
};

const speciesMetadataByTaxonomicOrder = new Map<number, SpeciesTaxonomyEntry>();
const canonicalTaxonomicOrderByTaxonomicOrder = new Map<number, number>();

(speciesTaxonomy as SpeciesTaxonomyEntry[]).forEach((species: SpeciesTaxonomyEntry) => {
    speciesMetadataByTaxonomicOrder.set(species.order, species);
    canonicalTaxonomicOrderByTaxonomicOrder.set(species.order, species.order);
    species.alternateTaxonomicOrders?.forEach((alternateTaxonomicOrder) => {
        speciesMetadataByTaxonomicOrder.set(alternateTaxonomicOrder, species);
        canonicalTaxonomicOrderByTaxonomicOrder.set(alternateTaxonomicOrder, species.order);
    });
});

const getCanonicalTaxonomicOrder = (taxonomicOrder: number): number => {
    return canonicalTaxonomicOrderByTaxonomicOrder.get(taxonomicOrder) ?? taxonomicOrder;
}

const getSpeciesReportMetadata = (taxonomicOrder: number): SpeciesTaxonomyEntry | null => {
    return speciesMetadataByTaxonomicOrder.get(taxonomicOrder) ?? null;
}

const canonicalizeObservationForReporting = (observation: EBirdMyDataSchema): EBirdMyDataSchema => {
    const reportAsTaxonomicOrder = observation.reportAsTaxonomicOrder ?? observation.canonicalTaxonomicOrder ?? observation.taxonomicOrder;
    const reportAs = getSpeciesReportMetadata(reportAsTaxonomicOrder);

    if (!reportAs) {
        return observation;
    }

    return {
        ...observation,
        taxonomicOrder: reportAs.order,
        commonName: reportAs.commonName,
        scientificName: reportAs.scientificName,
        canonicalTaxonomicOrder: reportAs.order,
        reportAsTaxonomicOrder: reportAs.order,
        reportAsCommonName: reportAs.commonName,
        reportAsScientificName: reportAs.scientificName,
        baseScientificName: reportAs.scientificName
    };
}

export const getChecklistByFamily = (observationsBySpecies: EBirdObservationsBySpecies[], baseChecklist?: EBirdChecklistByFamily[]): EBirdChecklistByFamily[] => {
    const checklist = baseChecklist ?? JSON.parse(JSON.stringify(emptyChecklist));

    const locateSpeciesAndFamilyInFamilyList = (taxonomicOrder: number) => {
        const foundFamilyIndex = taxonomyFamily.findIndex(el => taxonomicOrder >= el.min && taxonomicOrder <= el.max);
        // console.log(foundFamilyIndex);

        if (foundFamilyIndex >= 0) {
            const foundFamily = checklist[foundFamilyIndex];
            if (foundFamily) {
                const foundSpecies = foundFamily.speciesList.find(el => {
                    return el.taxonomicOrder === taxonomicOrder || el.alternateTaxonomicOrders?.includes(taxonomicOrder);
                });
                if (foundSpecies) {
                    return {
                        family: foundFamily,
                        species: foundSpecies
                    }
                }
            }
        }

        return {
            family: null,
            species: null
        };
    }

    for (const currentSpecies of observationsBySpecies) {
        const { family, species } = locateSpeciesAndFamilyInFamilyList(currentSpecies.taxonomicOrder);
        if (species && family) {
            const firstObservation = currentSpecies.observations?.length
                ? currentSpecies.observations.reduce((earliest, observation) => {
                    return getObservationTimestamp(observation) < getObservationTimestamp(earliest) ? observation : earliest;
                })
                : null;

            if (!firstObservation) {
                continue;
            }

            family.seen = true;

            if (currentSpecies && !species.firstObservation) {
                species.seen = true;
                species.firstObservation = firstObservation;
                family.seenCount++;
            }
        }
    }

    return checklist;
}

/**
 *
 * @param {EBirdMyDataSchema[]} annotatedData
 */
export const getObservationsByLocation = (annotatedData: EBirdMyDataSchema[]): EBirdObservationsByLocation[] => {
    const locationList = [];

    for (const row of annotatedData) {
        const foundSpecies = locationList.find(el => el.locationId === row.locationId);

        if (!row.locationId) continue;

        if (foundSpecies) {
            foundSpecies.observations.push(row);
        } else {
            locationList.push({
                locationId: row.locationId,
                location: row.location,
                observations: [row]
            })
        }
    }

    return locationList;
}

export default {
    loadDataFile,
    parseData,
    generateBookmarklet,
    parseCountabilityBundle,
    calibrateSightings,
    getCalibratedObservations,
    getCalibratedObservationsByTimePeriod,
    getCalibratedObservationsBySpecies,
    getFilteredObservations,
    getObservationsBySpecies,
    getObservationsByLocation,
    getMonthsWithObservations
};
