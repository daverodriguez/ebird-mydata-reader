import * as JSZip from "jszip";
import * as Papa from "papaparse";
import * as taxonomyRanged from './data/ranged-taxonomy.json';

const CSV_FILENAME = 'MyEBirdData.csv';

/**
 * Represents a single observation of one species in eBird
 */
export type EBirdMyDataSchema = {
    submissionID: string,
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
    observations: EBirdMyDataSchema[]
}

/**
 * An object containing all of a user's observations for a single location
 */
export type EBirdObservationsByLocation = {
    locationId: string,
    location: string,
    observations: EBirdMyDataSchema[]
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
        dynamicTyping: true
    }

    const jsonData = Papa.parse(csvData, options);

    return annotateData(jsonData.data);
}

/**
 * Accepts an array of eBird observation objects and calculates additional information including the observed year and month,
 * the base scientific name (without subspecies), and whether the bird is the first observation ever for a user (a "lifer"),
 * or the first observation in a calendar year
 * @param {EBirdMyDataSchema[]} rawData
 */
export const annotateData = (rawData: EBirdMyDataSchema[]): EBirdMyDataSchema[] => {
    let sortedObservations = rawData.sort((a, b) => {
        const dateA = new Date(`${a.date} ${a.time}`);
        const dateB = new Date(`${b.date} ${b.time}`);

        if (a.taxonomicOrder < b.taxonomicOrder) return -1;
        if (a.taxonomicOrder > b.taxonomicOrder) return 1;
        if (a.taxonomicOrder === b.taxonomicOrder) {
            if (dateA < dateB) return -1;
            if (dateA > dateB) return 1;
            return 0;
        }
    });

    // Mark the first bird of each taxonomic order code a "lifer"
    let prevObs = null;
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

        if (!prevObs || prevObs.taxonomicOrder !== obs.taxonomicOrder) {
            obs.isLifer = true;
        }

        if (prevObs?.taxonomicOrder === obs.taxonomicOrder && prevObs.observedYear !== obs.observedYear) {
            obs.isFirstOfYear = true;
        }

        prevObs = obs;
    });

    return sortedObservations;
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
        const isValidSpecies = row.scientificName.indexOf('sp.') < 0 && row.scientificName.indexOf('/') < 0 && !row.scientificName.match(/\(domestic/i);

        if (yearMatches && monthMatches && isValidSpecies) {
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
            if (accumulator.baseScientificName !== current.baseScientificName) {
                return [accumulator, current];
            }
            return [accumulator];
        }
        const found = accumulator.findIndex(el => el.baseScientificName === current.baseScientificName);
        return found >= 0 ? accumulator : [...accumulator, current];
    };

    if (getAllObservations) {
        return filteredObservations.sort(ebirdSortFunction);
    } else {
        let firstObservations: EBirdMyDataSchema[] = filteredObservations.reduce(firstObservationReducer);
        if (!Array.isArray(firstObservations)) {
            firstObservations = [firstObservations];
        }
        const sortedFirstObservations = firstObservations.sort(ebirdSortFunction);
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

const ebirdSortFunction = (a, b) => {
    const dateA = new Date(`${a.date} ${a.time}`).getTime();
    const dateB = new Date(`${b.date} ${b.time}`).getTime();

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

/**
 *
 * @param {EBirdMyDataSchema[]} annotatedData
 * @returns EBirdObservationsBySpecies[]
 */
export const getObservationsBySpecies = (annotatedData: EBirdMyDataSchema[]): EBirdObservationsBySpecies[] => {
    const speciesList = [];

    for (const row of annotatedData) {
        const foundSpecies = speciesList.find(el => el.taxonomicOrder === row.taxonomicOrder);

        if (!row.taxonomicOrder) continue;

        if (foundSpecies) {
            foundSpecies.observations.push(row);
        } else {
            speciesList.push({
                taxonomicOrder: row.taxonomicOrder,
                commonName: row.commonName,
                observations: [row]
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
export const getObservationsByFamily = async (annotatedData: EBirdMyDataSchema[]): Promise<EBirdObservationsByFamily[]> => {
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
                observations: [row]
            });
        }
    }

    return familyList;
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
    getFilteredObservations,
    getObservationsBySpecies,
    getObservationsByLocation,
    getMonthsWithObservations
};
