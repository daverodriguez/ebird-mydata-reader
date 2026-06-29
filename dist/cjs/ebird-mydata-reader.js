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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getObservationsByLocation = exports.getChecklistByFamily = exports.getObservationsByFamily = exports.getObservationsBySpecies = exports.getMonthsWithObservations = exports.getFilteredObservations = exports.annotateData = exports.parseData = exports.loadDataFile = void 0;
var JSZip = require("jszip");
var Papa = require("papaparse");
var taxonomyRanged = require("./data/ranged-taxonomy.json");
var taxonomyFamily = require("./data/family-taxonomy.json");
var emptyChecklist = require("./data/empty-checklist.json");
var speciesTaxonomy = require("./data/species-taxonomy.json");
var CSV_FILENAME = 'MyEBirdData.csv';
var columnTransforms = {
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
var headerTransformFunction = function (col) {
    if (columnTransforms.hasOwnProperty(col)) {
        return columnTransforms[col];
    }
    return col;
};
/**
 * Loads an eBird "My Data" ZIP file and extracts the CSV data, returning it as a string
 * @param {string|ArrayBuffer|Buffer} dataFile
 * @returns Promise<string>
 */
var loadDataFile = function (dataFile) { return __awaiter(void 0, void 0, void 0, function () {
    var zip, zipFile, csvFile, csvData;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                zip = new JSZip();
                return [4 /*yield*/, zip.loadAsync(dataFile)];
            case 1:
                zipFile = _a.sent();
                csvFile = zipFile.file(CSV_FILENAME);
                if (!csvFile) return [3 /*break*/, 3];
                return [4 /*yield*/, csvFile.async('string')];
            case 2:
                csvData = _a.sent();
                return [2 /*return*/, csvData];
            case 3: return [2 /*return*/, null];
        }
    });
}); };
exports.loadDataFile = loadDataFile;
/**
 * Parses a string containing eBird observations in CSV format and returns an array of enriched data objects
 * @param {string} csvData
 * @returns EBirdMyDataSchema[]
 */
var parseData = function (csvData) {
    console.log('Parsing eBird CSV data');
    var options = {
        header: true,
        transformHeader: headerTransformFunction,
        dynamicTyping: true
    };
    var jsonData = Papa.parse(csvData, options);
    return (0, exports.annotateData)(jsonData.data);
};
exports.parseData = parseData;
/**
 * Accepts an array of eBird observation objects and calculates additional information including the observed year and month,
 * the base scientific name (without subspecies), and whether the bird is the first observation ever for a user (a "lifer"),
 * or the first observation in a calendar year
 * @param {EBirdMyDataSchema[]} rawData
 */
var annotateData = function (rawData) {
    var sortedObservations = rawData.sort(function (a, b) {
        var dateA = new Date("".concat(a.date, " ").concat(a.time));
        var dateB = new Date("".concat(b.date, " ").concat(b.time));
        var canonicalTaxonomicOrderA = getCanonicalTaxonomicOrder(a.taxonomicOrder);
        var canonicalTaxonomicOrderB = getCanonicalTaxonomicOrder(b.taxonomicOrder);
        if (canonicalTaxonomicOrderA < canonicalTaxonomicOrderB)
            return -1;
        if (canonicalTaxonomicOrderA > canonicalTaxonomicOrderB)
            return 1;
        if (canonicalTaxonomicOrderA === canonicalTaxonomicOrderB) {
            if (dateA < dateB)
                return -1;
            if (dateA > dateB)
                return 1;
            return 0;
        }
    });
    var seenCanonicalTaxonomicOrders = new Set();
    var seenCanonicalTaxonomicOrderYears = new Set();
    sortedObservations.forEach(function (obs) {
        if (!obs.date)
            return;
        var dateSplit = obs.date.split('-');
        if (dateSplit.length === 3) {
            obs.observedYear = parseInt(dateSplit[0]);
            obs.observedMonth = parseInt(dateSplit[1]);
        }
        var scientificNameSegments = obs.scientificName.split(' ');
        if (scientificNameSegments.length >= 2) {
            obs.baseScientificName = "".concat(scientificNameSegments[0], " ").concat(scientificNameSegments[1]);
        }
        else {
            obs.baseScientificName = obs.scientificName;
        }
        obs.canonicalTaxonomicOrder = getCanonicalTaxonomicOrder(obs.taxonomicOrder);
        obs.isLifer = !seenCanonicalTaxonomicOrders.has(obs.canonicalTaxonomicOrder);
        seenCanonicalTaxonomicOrders.add(obs.canonicalTaxonomicOrder);
        var taxonYearKey = "".concat(obs.canonicalTaxonomicOrder, ":").concat(obs.observedYear);
        obs.isFirstOfYear = !seenCanonicalTaxonomicOrderYears.has(taxonYearKey);
        seenCanonicalTaxonomicOrderYears.add(taxonYearKey);
    });
    return sortedObservations;
};
exports.annotateData = annotateData;
/**
 *
 * @param annotatedData
 * @param filterYear
 * @param filterMonth
 * @param getAllObservations
 * @returns EBirdMyDataSchema[]
 */
var getFilteredObservations = function (annotatedData, filterYear, filterMonth, getAllObservations) {
    if (getAllObservations === void 0) { getAllObservations = false; }
    var filteredObservations = [];
    for (var _i = 0, annotatedData_1 = annotatedData; _i < annotatedData_1.length; _i++) {
        var row = annotatedData_1[_i];
        if (!row.date)
            continue;
        var _a = row.date.split('-'), tmpYear = _a[0], tmpMonth = _a[1];
        var year = parseInt(tmpYear);
        var month = parseInt(tmpMonth);
        var yearMatches = filterYear === "life" || year === filterYear;
        var monthMatches = !filterMonth || month === filterMonth;
        var isValidSpecies = row.scientificName.indexOf('sp.') < 0 && row.scientificName.indexOf('/') < 0 && !row.scientificName.match(/\(domestic/i);
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
    var firstObservationReducer = function (accumulator, current) {
        if (!Array.isArray(accumulator)) {
            if (accumulator.baseScientificName !== current.baseScientificName) {
                return [accumulator, current];
            }
            return [accumulator];
        }
        var found = accumulator.findIndex(function (el) { return el.baseScientificName === current.baseScientificName; });
        return found >= 0 ? accumulator : __spreadArray(__spreadArray([], accumulator, true), [current], false);
    };
    if (getAllObservations) {
        return filteredObservations.sort(ebirdSortFunction);
    }
    else {
        var firstObservations = filteredObservations.reduce(firstObservationReducer);
        if (!Array.isArray(firstObservations)) {
            firstObservations = [firstObservations];
        }
        var sortedFirstObservations = firstObservations.sort(ebirdSortFunction);
        return sortedFirstObservations;
    }
};
exports.getFilteredObservations = getFilteredObservations;
/**
 *
 * @param annotatedData
 * @param filterYear
 * @returns number[]
 */
var getMonthsWithObservations = function (annotatedData, filterYear) {
    annotatedData = (0, exports.getFilteredObservations)(annotatedData, filterYear, undefined, true);
    var months = [];
    for (var _i = 0, annotatedData_2 = annotatedData; _i < annotatedData_2.length; _i++) {
        var row = annotatedData_2[_i];
        var month = row.observedMonth;
        if (months.indexOf(month) < 0) {
            months.push(month);
        }
    }
    return months.sort(function (a, b) { return a - b; }); // Numeric sort
};
exports.getMonthsWithObservations = getMonthsWithObservations;
var ebirdSortFunction = function (a, b) {
    var dateA = new Date("".concat(a.date, " ").concat(a.time)).getTime();
    var dateB = new Date("".concat(b.date, " ").concat(b.time)).getTime();
    if (dateA < dateB)
        return -1;
    if (dateA === dateB) {
        if (a.taxonomicOrder < b.taxonomicOrder)
            return -1;
        if (a.taxonomicOrder > b.taxonomicOrder)
            return 1;
        if (a.taxonomicOrder === b.taxonomicOrder) {
            return 0;
        }
    }
    if (dateA > dateB)
        return 1;
    return 0;
};
var getObservationTimestamp = function (observation) {
    var timestamp = new Date("".concat(observation.date, " ").concat(observation.time)).getTime();
    return isNaN(timestamp) ? Number.MAX_SAFE_INTEGER : timestamp;
};
/**
 *
 * @param {EBirdMyDataSchema[]} annotatedData
 * @returns EBirdObservationsBySpecies[]
 */
var getObservationsBySpecies = function (annotatedData) {
    var speciesList = [];
    var _loop_1 = function (row) {
        var foundSpecies = speciesList.find(function (el) { return el.taxonomicOrder === row.taxonomicOrder; });
        if (!row.taxonomicOrder)
            return "continue";
        if (foundSpecies) {
            foundSpecies.observations.push(row);
        }
        else {
            speciesList.push({
                taxonomicOrder: row.taxonomicOrder,
                commonName: row.commonName,
                observations: [row]
            });
        }
    };
    for (var _i = 0, annotatedData_3 = annotatedData; _i < annotatedData_3.length; _i++) {
        var row = annotatedData_3[_i];
        _loop_1(row);
    }
    return speciesList;
};
exports.getObservationsBySpecies = getObservationsBySpecies;
/**
 *
 * @param {EBirdMyDataSchema[]} annotatedData
 * @returns EBirdObservationsByFamily[]
 */
var getObservationsByFamily = function (annotatedData) {
    var taxonomy = taxonomyRanged;
    var familyList = [];
    var _loop_2 = function (row) {
        if (!row.taxonomicOrder)
            return "continue";
        var foundFamily = taxonomy.find(function (el) { return row.taxonomicOrder >= el.min && row.taxonomicOrder <= el.max; });
        if (!foundFamily) {
            return "continue";
        }
        var foundSpeciesInFamily = familyList.find(function (el) { return el.familyName === foundFamily.fam; });
        if (foundSpeciesInFamily) {
            foundSpeciesInFamily.observations.push(row);
        }
        else {
            familyList.push({
                familyName: foundFamily.fam,
                familyScientific: foundFamily.familyScientific,
                familyCommon: foundFamily.familyCommon,
                observations: [row]
            });
        }
    };
    for (var _i = 0, annotatedData_4 = annotatedData; _i < annotatedData_4.length; _i++) {
        var row = annotatedData_4[_i];
        _loop_2(row);
    }
    return familyList;
};
exports.getObservationsByFamily = getObservationsByFamily;
var canonicalTaxonomicOrderByTaxonomicOrder = new Map();
speciesTaxonomy.forEach(function (species) {
    var _a;
    canonicalTaxonomicOrderByTaxonomicOrder.set(species.order, species.order);
    (_a = species.alternateTaxonomicOrders) === null || _a === void 0 ? void 0 : _a.forEach(function (alternateTaxonomicOrder) {
        canonicalTaxonomicOrderByTaxonomicOrder.set(alternateTaxonomicOrder, species.order);
    });
});
var getCanonicalTaxonomicOrder = function (taxonomicOrder) {
    var _a;
    return (_a = canonicalTaxonomicOrderByTaxonomicOrder.get(taxonomicOrder)) !== null && _a !== void 0 ? _a : taxonomicOrder;
};
var getChecklistByFamily = function (observationsBySpecies) {
    var _a;
    var checklist = JSON.parse(JSON.stringify(emptyChecklist));
    var locateSpeciesAndFamilyInFamilyList = function (taxonomicOrder) {
        var foundFamilyIndex = taxonomyFamily.findIndex(function (el) { return taxonomicOrder >= el.min && taxonomicOrder <= el.max; });
        // console.log(foundFamilyIndex);
        if (foundFamilyIndex >= 0) {
            var foundFamily = checklist[foundFamilyIndex];
            if (foundFamily) {
                var foundSpecies = foundFamily.speciesList.find(function (el) {
                    var _a;
                    return el.taxonomicOrder === taxonomicOrder || ((_a = el.alternateTaxonomicOrders) === null || _a === void 0 ? void 0 : _a.includes(taxonomicOrder));
                });
                if (foundSpecies) {
                    return {
                        family: foundFamily,
                        species: foundSpecies
                    };
                }
            }
        }
        return {
            family: null,
            species: null
        };
    };
    for (var _i = 0, observationsBySpecies_1 = observationsBySpecies; _i < observationsBySpecies_1.length; _i++) {
        var currentSpecies = observationsBySpecies_1[_i];
        var _b = locateSpeciesAndFamilyInFamilyList(currentSpecies.taxonomicOrder), family = _b.family, species = _b.species;
        if (species && family) {
            var firstObservation = ((_a = currentSpecies.observations) === null || _a === void 0 ? void 0 : _a.length)
                ? currentSpecies.observations.reduce(function (earliest, observation) {
                    return getObservationTimestamp(observation) < getObservationTimestamp(earliest) ? observation : earliest;
                })
                : null;
            if (!firstObservation) {
                continue;
            }
            family.seen = true;
            if (currentSpecies && !species.firstObservation) {
                species.seen = true;
                species.firstObservation = firstObservation;
                family.seenCount++;
            }
        }
    }
    return checklist;
};
exports.getChecklistByFamily = getChecklistByFamily;
/**
 *
 * @param {EBirdMyDataSchema[]} annotatedData
 */
var getObservationsByLocation = function (annotatedData) {
    var locationList = [];
    var _loop_3 = function (row) {
        var foundSpecies = locationList.find(function (el) { return el.locationId === row.locationId; });
        if (!row.locationId)
            return "continue";
        if (foundSpecies) {
            foundSpecies.observations.push(row);
        }
        else {
            locationList.push({
                locationId: row.locationId,
                location: row.location,
                observations: [row]
            });
        }
    };
    for (var _i = 0, annotatedData_5 = annotatedData; _i < annotatedData_5.length; _i++) {
        var row = annotatedData_5[_i];
        _loop_3(row);
    }
    return locationList;
};
exports.getObservationsByLocation = getObservationsByLocation;
exports.default = {
    loadDataFile: exports.loadDataFile,
    parseData: exports.parseData,
    getFilteredObservations: exports.getFilteredObservations,
    getObservationsBySpecies: exports.getObservationsBySpecies,
    getObservationsByLocation: exports.getObservationsByLocation,
    getMonthsWithObservations: exports.getMonthsWithObservations
};
