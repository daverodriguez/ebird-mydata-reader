/// <reference types="node" />
export declare type EBirdMyDataSchema = {
    submissionID: string;
    commonName: string;
    scientificName: string;
    taxonomicOrder: number;
    count: number;
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
export declare type EBirdObservationsBySpecies = {
    taxonomicOrder: number;
    commonName: string;
    observations: EBirdMyDataSchema[];
};
export declare type EBirdObservationsByLocation = {
    locationId: string;
    location: string;
    observations: EBirdMyDataSchema[];
};
export declare const loadDataFile: (dataFile: string | ArrayBuffer | Buffer) => Promise<string>;
export declare const parseData: (csvData: string) => EBirdMyDataSchema[];
export declare const annotateData: (rawData: EBirdMyDataSchema[]) => EBirdMyDataSchema[];
export declare const getFilteredObservations: (annotatedData: EBirdMyDataSchema[], filterYear: number | "life", filterMonth?: number, getAllObservations?: boolean) => any[];
export declare const getMonthsWithObservations: (annotatedData: EBirdMyDataSchema[], filterYear: number | "life") => number[];
export declare const getObservationsBySpecies: (annotatedData: EBirdMyDataSchema[]) => EBirdObservationsBySpecies[];
export declare const getObservationsByLocation: (annotatedData: EBirdMyDataSchema[]) => EBirdObservationsByLocation[];
declare const _default: {
    loadDataFile: (dataFile: string | ArrayBuffer | Buffer) => Promise<string>;
    parseData: (csvData: string) => EBirdMyDataSchema[];
    getFilteredObservations: (annotatedData: EBirdMyDataSchema[], filterYear: number | "life", filterMonth?: number, getAllObservations?: boolean) => any[];
    getObservationsBySpecies: (annotatedData: EBirdMyDataSchema[]) => EBirdObservationsBySpecies[];
    getObservationsByLocation: (annotatedData: EBirdMyDataSchema[]) => EBirdObservationsByLocation[];
    getMonthsWithObservations: (annotatedData: EBirdMyDataSchema[], filterYear: number | "life") => number[];
};
export default _default;
