import * as fs from 'fs';
import {
    loadDataFile,
    parseData,
    getObservationsByFamily,
    getObservationsByLocation,
    getObservationsBySpecies
} from "./ebird-mydata-reader";

const test = async () => {
    const dataFilePath = 'test-data/ebird_1687535582320.zip';
    const dataFile = fs.readFileSync(dataFilePath);

    const csvData = await loadDataFile(dataFile);
    const jsonData = parseData(csvData);

    const obsByLocation = getObservationsByLocation(jsonData);
    const obsBySpecies = getObservationsBySpecies(jsonData);
    const obsByFamily = await getObservationsByFamily(jsonData);

    fs.writeFileSync('test-data/test.json', JSON.stringify(jsonData, null, '\t'));
    fs.writeFileSync('test-data/test-families.json', JSON.stringify(obsByFamily, null, '\t'));
    fs.writeFileSync('test-data/test-species.json', JSON.stringify(obsBySpecies, null, '\t'));
    fs.writeFileSync('test-data/test-locations.json', JSON.stringify(obsByLocation, null, '\t'));
}

test();