/// <reference types="node" />
export declare const isSpeciesLevelObservation: (row: EBirdMyDataSchema) => boolean;
/**
 * @deprecated Use isSpeciesLevelObservation. This helper only detects species-level observation rows;
 * it does not reflect eBird's scoped Countable value.
 */
export declare const isCountableSpeciesObservation: (row: EBirdMyDataSchema) => boolean;
export declare const isValidObservation: (row: EBirdMyDataSchema) => boolean;
export declare const generateBookmarklet: (startYear?: number) => string;
/**
 * Represents a single observation of one species in eBird
 */
export declare type EBirdMyDataSchema = {
    submissionId: string;
    submissionID?: string;
    commonName: string;
    scientificName: string;
    taxonomicOrder: number;
    count: number | string;
    stateProvince: string;
    county: string;
    locationId: string;
    location: string;
    latitude: number;
    longitude: number;
    date: string;
    time: string;
    protocol: string;
    durationMin: number;
    allObsReported: number;
    distanceTraveledKm: number;
    areaCoveredHa: number;
    numberOfObservers: number;
    breedingCode: string;
    observationDetails: string;
    checklistComments: string;
    mlCatalogNumbers: string;
    observedYear?: number;
    observedMonth?: number;
    baseScientificName?: string;
    canonicalTaxonomicOrder?: number;
    reportAsTaxonomicOrder?: number;
    reportAsCommonName?: string;
    reportAsScientificName?: string;
    isLifer?: boolean;
    isFirstOfYear?: boolean;
};
/**
 * An object containing all of a user's observations for a single species
 */
export declare type EBirdObservationsBySpecies = {
    taxonomicOrder: number;
    commonName: string;
    observations: EBirdMyDataSchema[];
};
/**
 * An object containing all of a user's observations for a taxonomical family
 */
export declare type EBirdObservationsByFamily = {
    familyName: string;
    familyScientific?: string;
    familyCommon?: string;
    observations: EBirdMyDataSchema[];
};
export declare type EBirdChecklistByFamily = {
    familyName: string;
    familyScientific: string;
    familyCommon: string;
    seen: boolean;
    totalCount: number;
    seenCount: number;
    speciesList: EBirdChecklistBySpecies[];
    firstObservation: EBirdMyDataSchema;
};
export declare type EBirdChecklistBySpecies = {
    taxonomicOrder: number;
    scientificName: string;
    commonName: string;
    speciesCode: string;
    alternateSpeciesCodes: string[];
    alternateTaxonomicOrders?: number[];
    familyScientific: string;
    familyCommon: string;
    isExtinct: boolean;
    range: string;
    seen: boolean;
    firstObservation: EBirdMyDataSchema;
    image?: EBirdChecklistSpeciesImage;
};
export declare type EBirdChecklistSpeciesImage = {
    thumb?: string;
    medium?: string;
    full640?: string;
    meta?: string;
    source?: string;
    sourceUrl?: string;
    photographer?: string;
    license?: string;
    attribution?: string;
    speciesCode?: string;
    commonName?: string;
    scientificName?: string;
};
/**
 * An object containing all of a user's observations for a single location
 */
export declare type EBirdObservationsByLocation = {
    locationId: string;
    location: string;
    observations: EBirdMyDataSchema[];
};
export declare type EBirdCountabilityTaxon = {
    taxonOrder: number;
    category?: string;
    commonName?: string;
    scientificName?: string;
    count?: number | string;
    location?: string;
    stateProvince?: string;
    date?: string;
    locationId?: string;
    submissionId?: string;
    exotic?: string;
    countable?: boolean;
};
export declare type EBirdCountabilityBundleExport = {
    scope: 'life' | 'year';
    year?: number;
    region: string;
    url?: string;
    downloadedAt?: string;
    rowCount?: number;
    speciesCount?: number;
    countableSpeciesCount: number;
    countableTaxa: EBirdCountabilityTaxon[];
    taxa: EBirdCountabilityTaxon[];
};
export declare type EBirdCountabilityBundle = {
    schemaVersion: number;
    source: string;
    region: string;
    generatedAt?: string;
    exports: EBirdCountabilityBundleExport[];
};
export declare type EBirdSightingsCalibrationDiagnostic = {
    code: string;
    message: string;
    scope?: 'life' | 'year';
    year?: number;
    severity?: 'info' | 'warning' | 'error';
};
export declare type EBirdCountabilityScope = EBirdCountabilityBundleExport & {
    countableTaxonOrders: Set<number>;
    nonCountableTaxonOrders: Set<number>;
    countableObservationKeys: Set<string>;
};
export declare type EBirdCountabilityCalibration = {
    schemaVersion: 3;
    source: string;
    region: string;
    generatedAt?: string;
    life?: EBirdCountabilityScope;
    years: Record<string, EBirdCountabilityScope>;
    diagnostics: EBirdSightingsCalibrationDiagnostic[];
};
export declare type EBirdObservationCalibration = {
    source: 'list-export';
    scope: 'life' | 'year';
    year?: number;
    taxonOrder: number;
    countableSpecies: boolean;
    countableRepresentative: boolean;
    matchedBy?: 'submission-canonical' | 'canonical-fallback';
    exotic?: string;
    category?: string;
    listEntry?: EBirdCountabilityTaxon;
};
export declare type EBirdCalibratedObservation = EBirdMyDataSchema & {
    calibration?: {
        life?: EBirdObservationCalibration;
        years?: Record<string, EBirdObservationCalibration>;
    };
};
export declare type EBirdCalibratedScope = {
    scope: 'life' | 'year';
    year?: number;
    region: string;
    countableSpeciesCount: number;
    countableTaxonOrders: Set<number>;
    countableObservations: EBirdCalibratedObservation[];
    diagnostics: EBirdSightingsCalibrationDiagnostic[];
};
export declare type EBirdSightingsCalibrationResult = {
    observations: EBirdCalibratedObservation[];
    life?: EBirdCalibratedScope;
    years: Record<string, EBirdCalibratedScope>;
    diagnostics: EBirdSightingsCalibrationDiagnostic[];
};
/**
 * Loads an eBird "My Data" ZIP file and extracts the CSV data, returning it as a string
 * @param {string|ArrayBuffer|Buffer} dataFile
 * @returns Promise<string>
 */
export declare const loadDataFile: (dataFile: string | ArrayBuffer | Buffer) => Promise<string>;
/**
 * Parses a string containing eBird observations in CSV format and returns an array of enriched data objects
 * @param {string} csvData
 * @returns EBirdMyDataSchema[]
 */
export declare const parseData: (csvData: string) => EBirdMyDataSchema[];
export declare const parseCountabilityBundle: (bundleInput: string | EBirdCountabilityBundle) => EBirdCountabilityCalibration;
/**
 * Accepts an array of eBird observation objects and calculates additional information including the observed year and month,
 * the base scientific name (without subspecies), and whether the bird is the first observation ever for a user (a "lifer"),
 * or the first observation in a calendar year
 * @param {EBirdMyDataSchema[]} rawData
 */
export declare const annotateData: (rawData: EBirdMyDataSchema[]) => EBirdMyDataSchema[];
export declare const calibrateSightings: (annotatedData: EBirdMyDataSchema[], calibration: EBirdCountabilityCalibration) => EBirdSightingsCalibrationResult;
export declare const getCalibratedObservations: (calibrationResult: EBirdSightingsCalibrationResult, filterYear: number | 'life') => EBirdCalibratedObservation[];
export declare const getCalibratedObservationsByTimePeriod: (calibrationResult: EBirdSightingsCalibrationResult, filterYear: number | 'life') => EBirdCalibratedObservation[];
export declare const getCalibratedObservationsBySpecies: (calibrationResult: EBirdSightingsCalibrationResult, filterYear: number | 'life') => EBirdObservationsBySpecies[];
/**
 *
 * @param annotatedData
 * @param filterYear
 * @param filterMonth
 * @param getAllObservations
 * @returns EBirdMyDataSchema[]
 */
export declare const getFilteredObservations: (annotatedData: EBirdMyDataSchema[], filterYear: number | "life", filterMonth?: number, getAllObservations?: boolean) => EBirdMyDataSchema[];
/**
 *
 * @param annotatedData
 * @param filterYear
 * @returns number[]
 */
export declare const getMonthsWithObservations: (annotatedData: EBirdMyDataSchema[], filterYear: number | "life") => number[];
/**
 *
 * @param {EBirdMyDataSchema[]} annotatedData
 * @returns EBirdObservationsBySpecies[]
 */
export declare const getObservationsBySpecies: (annotatedData: EBirdMyDataSchema[]) => EBirdObservationsBySpecies[];
/**
 *
 * @param {EBirdMyDataSchema[]} annotatedData
 * @returns EBirdObservationsByFamily[]
 */
export declare const getObservationsByFamily: (annotatedData: EBirdMyDataSchema[]) => EBirdObservationsByFamily[];
export declare const getChecklistByFamily: (observationsBySpecies: EBirdObservationsBySpecies[], baseChecklist?: EBirdChecklistByFamily[]) => EBirdChecklistByFamily[];
/**
 *
 * @param {EBirdMyDataSchema[]} annotatedData
 */
export declare const getObservationsByLocation: (annotatedData: EBirdMyDataSchema[]) => EBirdObservationsByLocation[];
declare const _default: {
    loadDataFile: (dataFile: string | ArrayBuffer | Buffer) => Promise<string>;
    parseData: (csvData: string) => EBirdMyDataSchema[];
    generateBookmarklet: (startYear?: number) => string;
    parseCountabilityBundle: (bundleInput: string | EBirdCountabilityBundle) => EBirdCountabilityCalibration;
    calibrateSightings: (annotatedData: EBirdMyDataSchema[], calibration: EBirdCountabilityCalibration) => EBirdSightingsCalibrationResult;
    getCalibratedObservations: (calibrationResult: EBirdSightingsCalibrationResult, filterYear: number | "life") => EBirdCalibratedObservation[];
    getCalibratedObservationsByTimePeriod: (calibrationResult: EBirdSightingsCalibrationResult, filterYear: number | "life") => EBirdCalibratedObservation[];
    getCalibratedObservationsBySpecies: (calibrationResult: EBirdSightingsCalibrationResult, filterYear: number | "life") => EBirdObservationsBySpecies[];
    getFilteredObservations: (annotatedData: EBirdMyDataSchema[], filterYear: number | "life", filterMonth?: number, getAllObservations?: boolean) => EBirdMyDataSchema[];
    getObservationsBySpecies: (annotatedData: EBirdMyDataSchema[]) => EBirdObservationsBySpecies[];
    getObservationsByLocation: (annotatedData: EBirdMyDataSchema[]) => EBirdObservationsByLocation[];
    getMonthsWithObservations: (annotatedData: EBirdMyDataSchema[], filterYear: number | "life") => number[];
};
export default _default;
