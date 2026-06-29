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
import * as assert from 'assert';
import { annotateData, loadDataFile, parseData, getObservationsByFamily, getObservationsByLocation, getObservationsBySpecies, getChecklistByFamily } from "./ebird-mydata-reader";
const getTestObservation = (taxonomicOrder, commonName, scientificName, date, time) => {
    return {
        submissionID: `test-${taxonomicOrder}-${date}`,
        commonName,
        scientificName,
        taxonomicOrder,
        count: 1,
        stateProvince: 'US-OH',
        county: 'Franklin',
        locationId: 'L1',
        location: 'Test Location',
        latitude: 0,
        longitude: 0,
        date,
        time,
        protocol: 'eBird - Stationary Count',
        durationMin: 10,
        allObsReported: 1,
        distanceTraveledKm: null,
        areaCoveredHa: null,
        numberOfObservers: 1,
        breedingCode: null,
        observationDetails: null,
        checklistComments: null,
        mlCatalogNumbers: null
    };
};
const runAnnotationRegressionTests = () => {
    const parentObservation = getTestObservation(33559, 'Yellow-breasted Chat', 'Icteria virens', '2024-05-01', '08:00 AM');
    const alternateObservation = getTestObservation(33561, 'Yellow-breasted Chat (auricollis)', 'Icteria virens auricollis', '2024-05-02', '08:00 AM');
    const annotatedData = annotateData([alternateObservation, parentObservation]);
    const annotatedParent = annotatedData.find((observation) => observation.taxonomicOrder === 33559);
    const annotatedAlternate = annotatedData.find((observation) => observation.taxonomicOrder === 33561);
    assert.strictEqual(annotatedParent.taxonomicOrder, 33559);
    assert.strictEqual(annotatedAlternate.taxonomicOrder, 33561);
    assert.strictEqual(annotatedParent.canonicalTaxonomicOrder, 33559);
    assert.strictEqual(annotatedAlternate.canonicalTaxonomicOrder, 33559);
    assert.strictEqual(annotatedParent.isLifer, true);
    assert.strictEqual(annotatedAlternate.isLifer, false);
    assert.strictEqual(annotatedParent.isFirstOfYear, true);
    assert.strictEqual(annotatedAlternate.isFirstOfYear, false);
};
const test = () => __awaiter(void 0, void 0, void 0, function* () {
    runAnnotationRegressionTests();
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
