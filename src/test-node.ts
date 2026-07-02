import * as fs from 'fs';
import * as assert from 'assert';
import {
    annotateData,
    loadDataFile,
    parseData,
    getObservationsByFamily,
    getObservationsByLocation,
    getObservationsBySpecies, getChecklistByFamily
} from "./ebird-mydata-reader";

const getTestObservation = (taxonomicOrder: number, commonName: string, scientificName: string, date: string, time: string) => {
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
}

const runAnnotationRegressionTests = () => {
    const parentObservation = getTestObservation(
        33559,
        'Yellow-breasted Chat',
        'Icteria virens',
        '2024-05-01',
        '08:00 AM'
    );
    const alternateObservation = getTestObservation(
        33561,
        'Yellow-breasted Chat (auricollis)',
        'Icteria virens auricollis',
        '2024-05-02',
        '08:00 AM'
    );

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
}

const runBlankRowParsingRegressionTests = () => {
    const validObservation = getTestObservation(
        22674,
        'Toco Toucan',
        'Ramphastos toco',
        '2005-12-16',
        '12:00 PM'
    );

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
        { submissionId: null } as unknown as ReturnType<typeof getTestObservation>,
        validObservation
    ]);

    assert.strictEqual(annotatedData.length, 1);
    assert.strictEqual(annotatedData[0].commonName, 'Toco Toucan');
    assert.strictEqual(annotatedData[0].date, '2005-12-16');
}

const runReproFirstObservationRegressionTest = () => {
    const reproFilePath = process.env.EBIRD_REPRO_CSV || 'C:\\Users\\ohiod\\AppData\\Local\\Temp\\MyEBirdData.csv';
    if (!fs.existsSync(reproFilePath)) return;

    const parsedData = parseData(fs.readFileSync(reproFilePath, 'utf8'));
    assert.ok(parsedData.length > 0);
    assert.strictEqual(parsedData[0].date, '2005-12-16');
    assert.strictEqual(parsedData[0].time, '12:00 PM');
    assert.strictEqual(parsedData[0].commonName, 'Toco Toucan');
    assert.strictEqual(parsedData[0].submissionId, 'S60802938');
    assert.strictEqual(parsedData[0].submissionID, 'S60802938');
}

const runDateSortingRegressionTests = () => {
    const observations = [
        getTestObservation(500, 'Later Bird', 'Later birdus', '2024-01-02', '08:00'),
        getTestObservation(100, 'Middle Bird', 'Middle birdus', '2024-01-01', '09:00'),
        getTestObservation(300, 'Earlier Bird', 'Earlier birdus', '2024-01-01', '07:30')
    ];

    const annotatedData = annotateData(observations);
    assert.deepStrictEqual(
        annotatedData.map((observation) => observation.taxonomicOrder),
        [300, 100, 500]
    );

    const tiedObservations = [
        getTestObservation(500, 'Higher Taxon Bird', 'Higher birdus', '2024-01-01', '08:00'),
        getTestObservation(100, 'Lower Taxon Bird', 'Lower birdus', '2024-01-01', '08:00')
    ];

    const tiedAnnotatedData = annotateData(tiedObservations);
    assert.deepStrictEqual(
        tiedAnnotatedData.map((observation) => observation.taxonomicOrder),
        [100, 500]
    );
}

const test = async () => {
    runAnnotationRegressionTests();
    runBlankRowParsingRegressionTests();
    runReproFirstObservationRegressionTest();
    runDateSortingRegressionTests();

    const dataFilePath = 'test-data/ebird_1730602222414.zip';
    const dataFile = fs.readFileSync(dataFilePath);

    const csvData = await loadDataFile(dataFile);
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
}

test();
