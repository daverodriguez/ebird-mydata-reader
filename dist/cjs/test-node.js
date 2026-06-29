"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var fs = require("fs");
var assert = require("assert");
var ebird_mydata_reader_1 = require("./ebird-mydata-reader");
var getTestObservation = function (taxonomicOrder, commonName, scientificName, date, time) {
    return {
        submissionID: "test-".concat(taxonomicOrder, "-").concat(date),
        commonName: commonName,
        scientificName: scientificName,
        taxonomicOrder: taxonomicOrder,
        count: 1,
        stateProvince: 'US-OH',
        county: 'Franklin',
        locationId: 'L1',
        location: 'Test Location',
        latitude: 0,
        longitude: 0,
        date: date,
        time: time,
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
var runAnnotationRegressionTests = function () {
    var parentObservation = getTestObservation(33559, 'Yellow-breasted Chat', 'Icteria virens', '2024-05-01', '08:00 AM');
    var alternateObservation = getTestObservation(33561, 'Yellow-breasted Chat (auricollis)', 'Icteria virens auricollis', '2024-05-02', '08:00 AM');
    var annotatedData = (0, ebird_mydata_reader_1.annotateData)([alternateObservation, parentObservation]);
    var annotatedParent = annotatedData.find(function (observation) { return observation.taxonomicOrder === 33559; });
    var annotatedAlternate = annotatedData.find(function (observation) { return observation.taxonomicOrder === 33561; });
    assert.strictEqual(annotatedParent.taxonomicOrder, 33559);
    assert.strictEqual(annotatedAlternate.taxonomicOrder, 33561);
    assert.strictEqual(annotatedParent.canonicalTaxonomicOrder, 33559);
    assert.strictEqual(annotatedAlternate.canonicalTaxonomicOrder, 33559);
    assert.strictEqual(annotatedParent.isLifer, true);
    assert.strictEqual(annotatedAlternate.isLifer, false);
    assert.strictEqual(annotatedParent.isFirstOfYear, true);
    assert.strictEqual(annotatedAlternate.isFirstOfYear, false);
};
var runDateSortingRegressionTests = function () {
    var observations = [
        getTestObservation(500, 'Later Bird', 'Later birdus', '2024-01-02', '08:00'),
        getTestObservation(100, 'Middle Bird', 'Middle birdus', '2024-01-01', '09:00'),
        getTestObservation(300, 'Earlier Bird', 'Earlier birdus', '2024-01-01', '07:30')
    ];
    var annotatedData = (0, ebird_mydata_reader_1.annotateData)(observations);
    assert.deepStrictEqual(annotatedData.map(function (observation) { return observation.taxonomicOrder; }), [300, 100, 500]);
    var tiedObservations = [
        getTestObservation(500, 'Higher Taxon Bird', 'Higher birdus', '2024-01-01', '08:00'),
        getTestObservation(100, 'Lower Taxon Bird', 'Lower birdus', '2024-01-01', '08:00')
    ];
    var tiedAnnotatedData = (0, ebird_mydata_reader_1.annotateData)(tiedObservations);
    assert.deepStrictEqual(tiedAnnotatedData.map(function (observation) { return observation.taxonomicOrder; }), [100, 500]);
};
var test = function () { return __awaiter(void 0, void 0, void 0, function () {
    var dataFilePath, dataFile, csvData, jsonData, obsByLocation, obsBySpecies, obsByFamily, checklist;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                runAnnotationRegressionTests();
                runDateSortingRegressionTests();
                dataFilePath = 'test-data/ebird_1730602222414.zip';
                dataFile = fs.readFileSync(dataFilePath);
                return [4 /*yield*/, (0, ebird_mydata_reader_1.loadDataFile)(dataFile)];
            case 1:
                csvData = _a.sent();
                jsonData = (0, ebird_mydata_reader_1.parseData)(csvData);
                obsByLocation = (0, ebird_mydata_reader_1.getObservationsByLocation)(jsonData);
                obsBySpecies = (0, ebird_mydata_reader_1.getObservationsBySpecies)(jsonData);
                obsByFamily = (0, ebird_mydata_reader_1.getObservationsByFamily)(jsonData);
                checklist = (0, ebird_mydata_reader_1.getChecklistByFamily)(obsBySpecies);
                fs.writeFileSync('test-data/test.json', JSON.stringify(jsonData, null, '\t'));
                fs.writeFileSync('test-data/test-families.json', JSON.stringify(obsByFamily, null, '\t'));
                fs.writeFileSync('test-data/test-species.json', JSON.stringify(obsBySpecies, null, '\t'));
                fs.writeFileSync('test-data/test-locations.json', JSON.stringify(obsByLocation, null, '\t'));
                fs.writeFileSync('test-data/test-checklist.json', JSON.stringify(checklist, null, '\t'));
                return [2 /*return*/];
        }
    });
}); };
test();
