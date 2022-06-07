var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import * as JSZip from "jszip";
import * as Papa from "papaparse";
const CSV_FILENAME = 'MyEBirdData.csv';
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
};
export const loadDataFile = (dataFile) => __awaiter(void 0, void 0, void 0, function* () {
    console.log('Loading eBird data from ZIP file');
    const zip = new JSZip();
    const zipFile = yield zip.loadAsync(dataFile);
    const csvFile = zipFile.file(CSV_FILENAME);
    if (csvFile) {
        const csvData = yield csvFile.async('string');
        return csvData;
    }
    return null;
});
export const parseData = (csvData) => {
    console.log('Parsing eBird CSV data');
    const options = {
        header: true,
        transformHeader: headerTransformFunction,
        dynamicTyping: true
    };
    const jsonData = Papa.parse(csvData, options);
    return jsonData.data;
};
const filterObservations = (rawData, filterYear, filterMonth) => {
    let filteredObservations = [];
    for (let row of rawData) {
        if (!row.date)
            continue;
        const [tmpYear, tmpMonth] = row.date.split('-');
        const year = parseInt(tmpYear);
        const month = parseInt(tmpMonth);
        const yearMatches = filterYear === "life" || year === filterYear;
        const monthMatches = !filterMonth || month === filterMonth;
        const isValidSpecies = row.scientificName.indexOf('sp.') < 0 && row.scientificName.indexOf('/') < 0;
        if (yearMatches && monthMatches && isValidSpecies) {
            filteredObservations.push(row);
        }
    }
    filteredObservations = filteredObservations.sort((a, b) => {
        const dateA = new Date(`${a.date} ${a.time}`);
        const dateB = new Date(`${b.date} ${b.time}`);
        if (a.taxonomicOrder < b.taxonomicOrder)
            return -1;
        if (a.taxonomicOrder > b.taxonomicOrder)
            return 1;
        if (a.taxonomicOrder === b.taxonomicOrder) {
            if (dateA < dateB)
                return -1;
            if (dateA > dateB)
                return 1;
            return 0;
        }
    });
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
            return [current];
        }
        const found = accumulator.findIndex(el => el.taxonomicOrder === current.taxonomicOrder);
        return found >= 0 ? accumulator : [...accumulator, current];
    };
    const firstObservations = filteredObservations.reduce(firstObservationReducer);
    const sortedFirstObservations = firstObservations.sort((a, b) => {
        const dateA = new Date(`${a.date} ${a.time}`);
        const dateB = new Date(`${b.date} ${b.time}`);
        if (dateA < dateB)
            return -1;
        if (dateA > dateB)
            return 1;
        return 0;
    });
    return sortedFirstObservations;
};
export default {
    loadDataFile,
    parseData
};
