var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import * as fs from 'fs';
import { loadDataFile, parseData, getObservationsByFamily, getObservationsByLocation, getObservationsBySpecies, getChecklistByFamily } from "./ebird-mydata-reader";
const test = () => __awaiter(void 0, void 0, void 0, function* () {
    const dataFilePath = 'test-data/ebird_1730602222414.zip';
    const dataFile = fs.readFileSync(dataFilePath);
    const csvData = yield loadDataFile(dataFile);
    const jsonData = parseData(csvData);
    const obsByLocation = getObservationsByLocation(jsonData);
    const obsBySpecies = getObservationsBySpecies(jsonData);
    const obsByFamily = getObservationsByFamily(jsonData);
    const checklist = getChecklistByFamily(obsBySpecies);
    fs.writeFileSync('test-data/test.json', JSON.stringify(jsonData, null, '\t'));
    fs.writeFileSync('test-data/test-families.json', JSON.stringify(obsByFamily, null, '\t'));
    fs.writeFileSync('test-data/test-species.json', JSON.stringify(obsBySpecies, null, '\t'));
    fs.writeFileSync('test-data/test-locations.json', JSON.stringify(obsByLocation, null, '\t'));
    fs.writeFileSync('test-data/test-checklist.json', JSON.stringify(checklist, null, '\t'));
});
test();
