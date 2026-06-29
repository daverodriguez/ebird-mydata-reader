/// <reference types="node" />
/**
 * Represents a single observation of one species in eBird
 */
export declare type EBirdMyDataSchema = {
    submissionID: string;
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
    image?: {
        thumb?: string;
        medium?: string;
    };
};
/**
 * An object containing all of a user's observations for a single location
 */
export declare type EBirdObservationsByLocation = {
    locationId: string;
    location: string;
    observations: EBirdMyDataSchema[];
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
/**
 * Accepts an array of eBird observation objects and calculates additional information including the observed year and month,
 * the base scientific name (without subspecies), and whether the bird is the first observation ever for a user (a "lifer"),
 * or the first observation in a calendar year
 * @param {EBirdMyDataSchema[]} rawData
 */
export declare const annotateData: (rawData: EBirdMyDataSchema[]) => EBirdMyDataSchema[];
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
export declare const getChecklistByFamily: (observationsBySpecies: EBirdObservationsBySpecies[]) => EBirdChecklistByFamily[];
/**
 *
 * @param {EBirdMyDataSchema[]} annotatedData
 */
export declare const getObservationsByLocation: (annotatedData: EBirdMyDataSchema[]) => EBirdObservationsByLocation[];
declare const _default: {
    loadDataFile: (dataFile: string | ArrayBuffer | Buffer) => Promise<string>;
    parseData: (csvData: string) => EBirdMyDataSchema[];
    getFilteredObservations: (annotatedData: EBirdMyDataSchema[], filterYear: number | "life", filterMonth?: number, getAllObservations?: boolean) => EBirdMyDataSchema[];
    getObservationsBySpecies: (annotatedData: EBirdMyDataSchema[]) => EBirdObservationsBySpecies[];
    getObservationsByLocation: (annotatedData: EBirdMyDataSchema[]) => EBirdObservationsByLocation[];
    getMonthsWithObservations: (annotatedData: EBirdMyDataSchema[], filterYear: number | "life") => number[];
};
export default _default;
