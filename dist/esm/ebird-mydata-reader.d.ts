/// <reference types="node" />
export declare type EBirdMyDataSchema = {
    submissionID: string;
    commonName: string;
    scientificName: string;
    taxonomicOrder: number;
    count: number;
    stateProvince: string;
    county: string;
    locationID: string;
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
};
export declare const loadDataFile: (dataFile: string | ArrayBuffer | Buffer) => Promise<string>;
export declare const parseData: (csvData: string) => any;
declare const _default: {
    loadDataFile: (dataFile: string | ArrayBuffer | Buffer) => Promise<string>;
    parseData: (csvData: string) => any;
};
export default _default;
