import * as JSZip from "jszip";
import * as Papa from "papaparse";

const CSV_FILENAME = 'MyEBirdData.csv';

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

export type EBirdObservationsBySpecies = {
    taxonomicOrder: number,
    commonName: string,
    observations: EBirdMyDataSchema[]
}

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

export const loadDataFile = async (dataFile: string | ArrayBuffer | Buffer) => {
    console.log('Loading eBird data from ZIP file');
    const zip = new JSZip();

    const zipFile = await zip.loadAsync(dataFile);
    const csvFile = zipFile.file(CSV_FILENAME);
    if (csvFile) {
        const csvData = await csvFile.async('string');
        return csvData;
    }

    return null;
}

export const parseData = (csvData: string) => {
    console.log('Parsing eBird CSV data');
    const options = {
        header: true,
        transformHeader: headerTransformFunction,
        dynamicTyping: true
    }

    const jsonData = Papa.parse(csvData, options);

    return annotateData(jsonData.data);
}

export const annotateData = (rawData: EBirdMyDataSchema[]) => {
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

export const getFilteredObservations = (
    annotatedData: EBirdMyDataSchema[],
    filterYear: number | "life",
    filterMonth?: number,
    getAllObservations = false
    ) => {
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
