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
import { annotateData, calibrateSightings, getFilteredObservations, getCalibratedObservations, getCalibratedObservationsBySpecies, loadDataFile, parseCountabilityBundle, parseData, getObservationsByFamily, getObservationsByLocation, getObservationsBySpecies, getChecklistByFamily } from "./ebird-mydata-reader";
const getTestObservation = (taxonomicOrder, commonName, scientificName, date, time) => {
    return {
        submissionId: `test-${taxonomicOrder}-${date}`,
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
    const filteredLifeList = getFilteredObservations(annotatedData, 'life');
    assert.strictEqual(filteredLifeList.length, 1);
    assert.strictEqual(filteredLifeList[0].taxonomicOrder, 33559);
    assert.strictEqual(filteredLifeList[0].commonName, 'Yellow-breasted Chat');
    assert.strictEqual(filteredLifeList[0].scientificName, 'Icteria virens');
};
const runTaxonomicMergeRegressionTests = () => {
    const parentObservation = getTestObservation(5500, 'American Coot', 'Fulica americana', '2024-01-01', '08:00 AM');
    const alternateObservation = getTestObservation(5503, 'American Coot (Red-shielded)', 'Fulica americana (Red-shielded)', '2024-01-02', '08:00 AM');
    const annotatedData = annotateData([alternateObservation, parentObservation]);
    const filteredLifeList = getFilteredObservations(annotatedData, 'life');
    const obsBySpecies = getObservationsBySpecies(annotatedData);
    assert.strictEqual(filteredLifeList.length, 1);
    assert.strictEqual(filteredLifeList[0].taxonomicOrder, 5500);
    assert.strictEqual(filteredLifeList[0].commonName, 'American Coot');
    assert.strictEqual(filteredLifeList[0].scientificName, 'Fulica americana');
    assert.strictEqual(filteredLifeList[0].reportAsTaxonomicOrder, 5500);
    assert.strictEqual(filteredLifeList[0].reportAsCommonName, 'American Coot');
    assert.strictEqual(filteredLifeList[0].reportAsScientificName, 'Fulica americana');
    assert.strictEqual(obsBySpecies.length, 1);
    assert.strictEqual(obsBySpecies[0].taxonomicOrder, 5500);
    assert.strictEqual(obsBySpecies[0].commonName, 'American Coot');
    assert.strictEqual(obsBySpecies[0].observations.length, 2);
};
const runBlankRowParsingRegressionTests = () => {
    const validObservation = getTestObservation(22674, 'Toco Toucan', 'Ramphastos toco', '2005-12-16', '12:00 PM');
    const parsedWithTrailingBlank = parseData([
        'Submission ID,Common Name,Scientific Name,Taxonomic Order,Date,Time,Location ID,Location',
        'S60802938,Toco Toucan,Ramphastos toco,22674,2005-12-16,12:00 PM,L1,PN Iguazu--Area Cataratas',
        ''
    ].join('\n'));
    assert.strictEqual(parsedWithTrailingBlank.length, 1);
    assert.strictEqual(parsedWithTrailingBlank[0].commonName, 'Toco Toucan');
    assert.strictEqual(parsedWithTrailingBlank[0].submissionId, 'S60802938');
    assert.strictEqual(parsedWithTrailingBlank[0].submissionID, 'S60802938');
    const parsedWithNullSubmissionIdRow = parseData([
        'Submission ID,Common Name,Scientific Name,Taxonomic Order,Date,Time,Location ID,Location',
        ',,,,,,,',
        'S60802938,Toco Toucan,Ramphastos toco,22674,2005-12-16,12:00 PM,L1,PN Iguazu--Area Cataratas'
    ].join('\n'));
    assert.strictEqual(parsedWithNullSubmissionIdRow.length, 1);
    assert.strictEqual(parsedWithNullSubmissionIdRow[0].commonName, 'Toco Toucan');
    const annotatedData = annotateData([
        { submissionId: null },
        validObservation
    ]);
    assert.strictEqual(annotatedData.length, 1);
    assert.strictEqual(annotatedData[0].commonName, 'Toco Toucan');
    assert.strictEqual(annotatedData[0].date, '2005-12-16');
};
const runReproFirstObservationRegressionTest = () => {
    const reproFilePath = process.env.EBIRD_REPRO_CSV || 'C:\\Users\\ohiod\\AppData\\Local\\Temp\\MyEBirdData.csv';
    if (!fs.existsSync(reproFilePath))
        return;
    const parsedData = parseData(fs.readFileSync(reproFilePath, 'utf8'));
    assert.ok(parsedData.length > 0);
    assert.strictEqual(parsedData[0].date, '2005-12-16');
    assert.strictEqual(parsedData[0].time, '12:00 PM');
    assert.strictEqual(parsedData[0].commonName, 'Toco Toucan');
    assert.strictEqual(parsedData[0].submissionId, 'S60802938');
    assert.strictEqual(parsedData[0].submissionID, 'S60802938');
};
const runDateSortingRegressionTests = () => {
    const observations = [
        getTestObservation(500, 'Later Bird', 'Later birdus', '2024-01-02', '08:00'),
        getTestObservation(100, 'Middle Bird', 'Middle birdus', '2024-01-01', '09:00'),
        getTestObservation(300, 'Earlier Bird', 'Earlier birdus', '2024-01-01', '07:30')
    ];
    const annotatedData = annotateData(observations);
    assert.deepStrictEqual(annotatedData.map((observation) => observation.taxonomicOrder), [300, 100, 500]);
    const tiedObservations = [
        getTestObservation(500, 'Higher Taxon Bird', 'Higher birdus', '2024-01-01', '08:00'),
        getTestObservation(100, 'Lower Taxon Bird', 'Lower birdus', '2024-01-01', '08:00')
    ];
    const tiedAnnotatedData = annotateData(tiedObservations);
    assert.deepStrictEqual(tiedAnnotatedData.map((observation) => observation.taxonomicOrder), [100, 500]);
};
const runCountabilityCalibrationRegressionTests = () => {
    const domesticMuscovy2009 = getTestObservation(446, 'Muscovy Duck (Domestic type)', 'Cairina moschata (Domestic type)', '2009-03-19', '09:00 AM');
    domesticMuscovy2009.submissionId = 'S2009';
    domesticMuscovy2009.locationId = 'L2009';
    const domesticMuscovy2024 = getTestObservation(446, 'Muscovy Duck (Domestic type)', 'Cairina moschata (Domestic type)', '2024-02-15', '05:30 PM');
    domesticMuscovy2024.submissionId = 'S2024-domestic';
    domesticMuscovy2024.locationId = 'L2024-domestic';
    const wildMuscovy2024 = getTestObservation(445, 'Muscovy Duck', 'Cairina moschata', '2024-11-08', '07:25 AM');
    wildMuscovy2024.submissionId = 'S2024-wild';
    wildMuscovy2024.locationId = 'L2024-wild';
    const annotatedData = annotateData([domesticMuscovy2024, wildMuscovy2024, domesticMuscovy2009]);
    const countability = parseCountabilityBundle({
        schemaVersion: 3,
        source: 'ebird-list-countability',
        region: 'world',
        exports: [
            {
                scope: 'year',
                year: 2009,
                region: 'world',
                countableSpeciesCount: 1,
                countableTaxa: [
                    { taxonOrder: 445, submissionId: 'S2009', locationId: 'L2009', date: '19 Mar 2009' }
                ],
                taxa: [
                    {
                        taxonOrder: 445,
                        category: 'species',
                        commonName: 'Muscovy Duck',
                        scientificName: 'Cairina moschata',
                        submissionId: 'S2009',
                        locationId: 'L2009',
                        date: '19 Mar 2009',
                        exotic: 'N',
                        countable: true
                    }
                ]
            },
            {
                scope: 'year',
                year: 2024,
                region: 'world',
                countableSpeciesCount: 1,
                countableTaxa: [
                    { taxonOrder: 445, submissionId: 'S2024-wild', locationId: 'L2024-wild', date: '08 Nov 2024' }
                ],
                taxa: []
            }
        ]
    });
    const calibrated = calibrateSightings(annotatedData, countability);
    const calibrated2009 = getCalibratedObservations(calibrated, 2009);
    assert.strictEqual(calibrated2009.length, 1);
    assert.strictEqual(calibrated2009[0].submissionId, 'S2009');
    assert.strictEqual(calibrated2009[0].taxonomicOrder, 446);
    assert.strictEqual(calibrated2009[0].canonicalTaxonomicOrder, 445);
    assert.strictEqual(calibrated2009[0].calibration.years['2009'].countableRepresentative, true);
    const calibrated2024 = getCalibratedObservations(calibrated, 2024);
    assert.strictEqual(calibrated2024.length, 1);
    assert.strictEqual(calibrated2024[0].submissionId, 'S2024-wild');
    assert.strictEqual(calibrated2024[0].taxonomicOrder, 445);
    assert.strictEqual(calibrated.observations.find((obs) => obs.submissionId === 'S2024-domestic').calibration.years['2024'].countableSpecies, true);
    assert.strictEqual(calibrated.observations.find((obs) => obs.submissionId === 'S2024-domestic').calibration.years['2024'].countableRepresentative, false);
    const calibratedSpecies2009 = getCalibratedObservationsBySpecies(calibrated, 2009);
    assert.strictEqual(calibratedSpecies2009.length, 1);
    assert.strictEqual(calibratedSpecies2009[0].taxonomicOrder, 445);
    assert.strictEqual(calibratedSpecies2009[0].commonName, 'Muscovy Duck');
    assert.strictEqual(calibrated.diagnostics.length, 0);
};
const test = () => __awaiter(void 0, void 0, void 0, function* () {
    runAnnotationRegressionTests();
    runTaxonomicMergeRegressionTests();
    runBlankRowParsingRegressionTests();
    runReproFirstObservationRegressionTest();
    runDateSortingRegressionTests();
    runCountabilityCalibrationRegressionTests();
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
