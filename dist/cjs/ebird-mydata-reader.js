"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
exports.getObservationsByLocation = exports.getChecklistByFamily = exports.getObservationsByFamily = exports.getObservationsBySpecies = exports.getMonthsWithObservations = exports.getFilteredObservations = exports.getCalibratedObservationsBySpecies = exports.getCalibratedObservationsByTimePeriod = exports.getCalibratedObservations = exports.calibrateSightings = exports.annotateData = exports.parseCountabilityBundle = exports.parseData = exports.loadDataFile = exports.generateBookmarklet = exports.isValidObservation = exports.isCountableSpeciesObservation = exports.isSpeciesLevelObservation = void 0;
var JSZip = require("jszip");
var Papa = require("papaparse");
var taxonomyRanged = require("./data/ranged-taxonomy.json");
var taxonomyFamily = require("./data/family-taxonomy.json");
var emptyChecklist = require("./data/empty-checklist.json");
var speciesTaxonomy = require("./data/species-taxonomy.json");
var CSV_FILENAME = 'MyEBirdData.csv';
var DEFAULT_BOOKMARKLET_START_YEAR = 2020;
var isSpeciesLevelObservation = function (row) {
    var _a;
    var scientificName = (_a = row.scientificName) !== null && _a !== void 0 ? _a : '';
    var speciesLevelName = scientificName.split(' ').slice(0, 2).join(' ');
    return scientificName.indexOf('sp.') < 0
        && speciesLevelName.indexOf('/') < 0
        && scientificName.indexOf(' x ') < 0
        && !scientificName.match(/\(domestic/i);
};
exports.isSpeciesLevelObservation = isSpeciesLevelObservation;
/**
 * @deprecated Use isSpeciesLevelObservation. This helper only detects species-level observation rows;
 * it does not reflect eBird's scoped Countable value.
 */
exports.isCountableSpeciesObservation = exports.isSpeciesLevelObservation;
var isValidObservation = function (row) {
    if (!row)
        return false;
    return !!row.date
        && !!row.commonName
        && !!row.scientificName
        && !!row.taxonomicOrder;
};
exports.isValidObservation = isValidObservation;
var generateBookmarklet = function (startYear) {
    if (startYear === void 0) { startYear = DEFAULT_BOOKMARKLET_START_YEAR; }
    var currentYear = new Date().getFullYear();
    if (!Number.isInteger(startYear) || startYear < 1900 || startYear > currentYear) {
        throw new RangeError("startYear must be an integer between 1900 and ".concat(currentYear));
    }
    return "javascript:\n(async () => {\n    const region = \"world\";\n    const startYear = ".concat(startYear, ";\n    const endYear = new Date().getFullYear();\n    const years = Array.from({length: endYear - startYear + 1}, (_, i) => startYear + i);\n    if (!location.hostname.endsWith(\"ebird.org\")) {\n        alert(\"Open eBird.org while logged in, then click this bookmarklet.\");\n        return;\n    }\n    const fetchCsv = async (url) => {\n        const response = await fetch(url, {credentials: \"include\"});\n        const text = await response.text();\n        if (!response.ok) throw new Error(response.status + \" \" + url);\n        if (text.trim().startsWith(\"<\")) throw new Error(\"Expected CSV but got HTML for \" + url + \". Are you logged in?\");\n        return text;\n    };\n    const parseCsv = (text) => {\n        const rows = [];\n        let row = [];\n        let field = \"\";\n        let quoted = false;\n        for (let i = 0; i < text.length; i++) {\n            const char = text[i];\n            const next = text[i + 1];\n            if (quoted) {\n                if (char === '\"' && next === '\"') {\n                    field += '\"';\n                    i++;\n                } else if (char === '\"') {\n                    quoted = false;\n                } else {\n                    field += char;\n                }\n            } else if (char === '\"') {\n                quoted = true;\n            } else if (char === \",\") {\n                row.push(field);\n                field = \"\";\n            } else if (char === \"\\n\") {\n                row.push(field);\n                rows.push(row);\n                row = [];\n                field = \"\";\n            } else if (char !== \"\\r\") {\n                field += char;\n            }\n        }\n        if (field.length || row.length) {\n            row.push(field);\n            rows.push(row);\n        }\n        return rows.filter((csvRow) => csvRow.some((value) => value.trim()));\n    };\n    const getValue = (row, headers, name) => row[headers.indexOf(name)] || \"\";\n    const summarizeExport = async ({scope, year, url}) => {\n        const csv = await fetchCsv(url);\n        const parsed = parseCsv(csv);\n        const headers = parsed.shift();\n        if (!headers) throw new Error(\"No CSV headers for \" + url);\n        const requiredColumns = [\"Taxon Order\", \"Category\", \"Common Name\", \"Scientific Name\", \"Count\", \"Location\", \"S/P\", \"Date\", \"LocID\", \"SubID\", \"Exotic\", \"Countable\"];\n        const missingColumns = requiredColumns.filter((column) => !headers.includes(column));\n        if (missingColumns.length) throw new Error(\"Missing CSV columns for \" + url + \": \" + missingColumns.join(\", \"));\n        const rows = parsed.map((row) => {\n            const category = getValue(row, headers, \"Category\");\n            const countable = getValue(row, headers, \"Countable\").trim() === \"1\";\n            const exotic = getValue(row, headers, \"Exotic\").trim();\n            return {\n                taxonOrder: Number(getValue(row, headers, \"Taxon Order\")),\n                category,\n                commonName: getValue(row, headers, \"Common Name\"),\n                scientificName: getValue(row, headers, \"Scientific Name\"),\n                count: getValue(row, headers, \"Count\") || null,\n                location: getValue(row, headers, \"Location\") || null,\n                stateProvince: getValue(row, headers, \"S/P\") || null,\n                date: getValue(row, headers, \"Date\") || null,\n                locationId: getValue(row, headers, \"LocID\") || null,\n                submissionId: getValue(row, headers, \"SubID\") || null,\n                exotic: exotic || null,\n                countable\n            };\n        }).filter((row) => Number.isFinite(row.taxonOrder));\n        const speciesRows = rows.filter((row) => row.category === \"species\");\n        const countableTaxa = speciesRows\n            .filter((row) => row.countable)\n            .map((row) => ({\n                taxonOrder: row.taxonOrder,\n                submissionId: row.submissionId,\n                locationId: row.locationId,\n                date: row.date\n            }));\n        return {\n            scope,\n            year,\n            region,\n            url: \"https://ebird.org\" + url,\n            downloadedAt: new Date().toISOString(),\n            rowCount: rows.length,\n            speciesCount: speciesRows.length,\n            countableSpeciesCount: countableTaxa.length,\n            countableTaxa,\n            taxa: rows.filter((row) => row.category !== \"species\" || !row.countable || row.exotic)\n        };\n    };\n    try {\n        const exports = [];\n        exports.push(await summarizeExport({scope: \"life\", url: \"/lifelist?r=\" + region + \"&fmt=csv\"}));\n        for (const year of years) {\n            exports.push(await summarizeExport({scope: \"year\", year, url: \"/lifelist?r=\" + region + \"&time=year&year=\" + year + \"&fmt=csv\"}));\n        }\n        const bundle = {\n            schemaVersion: 3,\n            source: \"ebird-list-countability\",\n            region,\n            generatedAt: new Date().toISOString(),\n            exports\n        };\n        const blob = new Blob([JSON.stringify(bundle, null, 2)], {type: \"application/json\"});\n        const link = document.createElement(\"a\");\n        link.href = URL.createObjectURL(blob);\n        link.download = \"bme-ebird-list-countability-\" + region + \"-v3-\" + new Date().toISOString().slice(0, 10) + \".json\";\n        document.body.appendChild(link);\n        link.click();\n        link.remove();\n        setTimeout(() => URL.revokeObjectURL(link.href), 1000);\n    } catch (error) {\n        console.error(error);\n        alert(\"Unable to build BME eBird countability bundle: \" + error.message);\n    }\n})();");
};
exports.generateBookmarklet = generateBookmarklet;
var normalizeObservation = function (row) {
    var _a;
    if (!row)
        return row;
    var submissionId = (_a = row.submissionId) !== null && _a !== void 0 ? _a : row.submissionID;
    row.submissionId = submissionId;
    row.submissionID = submissionId;
    return row;
};
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
        dynamicTyping: true,
        skipEmptyLines: 'greedy'
    };
    var jsonData = Papa.parse(csvData, options);
    return (0, exports.annotateData)(jsonData.data);
};
exports.parseData = parseData;
var getCalibrationObservationKey = function (submissionId, taxonOrder) {
    return "".concat(submissionId, ":").concat(taxonOrder);
};
var normalizeCountabilityTaxon = function (taxon) {
    var taxonOrder = Number(taxon === null || taxon === void 0 ? void 0 : taxon.taxonOrder);
    return __assign(__assign({}, taxon), { taxonOrder: taxonOrder, submissionId: (taxon === null || taxon === void 0 ? void 0 : taxon.submissionId) || null, locationId: (taxon === null || taxon === void 0 ? void 0 : taxon.locationId) || null, date: (taxon === null || taxon === void 0 ? void 0 : taxon.date) || null, exotic: (taxon === null || taxon === void 0 ? void 0 : taxon.exotic) || null });
};
var parseCountabilityScope = function (rawScope) {
    var _a, _b;
    var countableTaxa = ((_a = rawScope.countableTaxa) !== null && _a !== void 0 ? _a : [])
        .map(normalizeCountabilityTaxon)
        .filter(function (taxon) { return Number.isFinite(taxon.taxonOrder); });
    var taxa = ((_b = rawScope.taxa) !== null && _b !== void 0 ? _b : [])
        .map(normalizeCountabilityTaxon)
        .filter(function (taxon) { return Number.isFinite(taxon.taxonOrder); });
    return __assign(__assign({}, rawScope), { countableTaxa: countableTaxa, taxa: taxa, countableTaxonOrders: new Set(countableTaxa.map(function (taxon) { return taxon.taxonOrder; })), nonCountableTaxonOrders: new Set(taxa
            .filter(function (taxon) { return taxon.category === 'species' && taxon.countable === false; })
            .map(function (taxon) { return taxon.taxonOrder; })), countableObservationKeys: new Set(countableTaxa
            .filter(function (taxon) { return !!taxon.submissionId; })
            .map(function (taxon) { return getCalibrationObservationKey(taxon.submissionId, taxon.taxonOrder); })) });
};
var parseCountabilityBundle = function (bundleInput) {
    var bundle = typeof bundleInput === 'string' ? JSON.parse(bundleInput) : bundleInput;
    if (!bundle || bundle.schemaVersion !== 3 || bundle.source !== 'ebird-list-countability') {
        throw new Error('Expected an eBird countability bundle with schemaVersion 3');
    }
    if (!Array.isArray(bundle.exports)) {
        throw new Error('Expected an eBird countability bundle with an exports array');
    }
    var diagnostics = [];
    var calibration = {
        schemaVersion: 3,
        source: bundle.source,
        region: bundle.region,
        generatedAt: bundle.generatedAt,
        years: {},
        diagnostics: diagnostics
    };
    for (var _i = 0, _a = bundle.exports; _i < _a.length; _i++) {
        var rawScope = _a[_i];
        if (rawScope.scope !== 'life' && rawScope.scope !== 'year') {
            diagnostics.push({
                code: 'unknown-scope',
                message: "Skipping unsupported countability scope: ".concat(rawScope.scope),
                severity: 'warning'
            });
            continue;
        }
        if (rawScope.scope === 'year' && !Number.isInteger(rawScope.year)) {
            diagnostics.push({
                code: 'missing-year',
                message: 'Skipping year countability scope without a numeric year',
                scope: 'year',
                severity: 'warning'
            });
            continue;
        }
        var scope = parseCountabilityScope(rawScope);
        if (scope.scope === 'life') {
            if (calibration.life) {
                diagnostics.push({
                    code: 'duplicate-life-scope',
                    message: 'Duplicate life countability scope found; using the last one',
                    scope: 'life',
                    severity: 'warning'
                });
            }
            calibration.life = scope;
        }
        else {
            var yearKey = scope.year.toString();
            if (calibration.years[yearKey]) {
                diagnostics.push({
                    code: 'duplicate-year-scope',
                    message: "Duplicate year countability scope found for ".concat(yearKey, "; using the last one"),
                    scope: 'year',
                    year: scope.year,
                    severity: 'warning'
                });
            }
            calibration.years[yearKey] = scope;
        }
    }
    return calibration;
};
exports.parseCountabilityBundle = parseCountabilityBundle;
/**
 * Accepts an array of eBird observation objects and calculates additional information including the observed year and month,
 * the base scientific name (without subspecies), and whether the bird is the first observation ever for a user (a "lifer"),
 * or the first observation in a calendar year
 * @param {EBirdMyDataSchema[]} rawData
 */
var annotateData = function (rawData) {
    var sortedObservations = rawData.map(normalizeObservation).filter(exports.isValidObservation).sort(function (a, b) {
        var timestampA = getObservationTimestamp(a);
        var timestampB = getObservationTimestamp(b);
        if (timestampA < timestampB)
            return -1;
        if (timestampA > timestampB)
            return 1;
        if (timestampA === timestampB) {
            if (a.taxonomicOrder < b.taxonomicOrder)
                return -1;
            if (a.taxonomicOrder > b.taxonomicOrder)
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
        var reportAs = getSpeciesReportMetadata(obs.taxonomicOrder);
        if (reportAs) {
            obs.reportAsTaxonomicOrder = reportAs.order;
            obs.reportAsCommonName = reportAs.commonName;
            obs.reportAsScientificName = reportAs.scientificName;
        }
        obs.isLifer = !seenCanonicalTaxonomicOrders.has(obs.canonicalTaxonomicOrder);
        seenCanonicalTaxonomicOrders.add(obs.canonicalTaxonomicOrder);
        var taxonYearKey = "".concat(obs.canonicalTaxonomicOrder, ":").concat(obs.observedYear);
        obs.isFirstOfYear = !seenCanonicalTaxonomicOrderYears.has(taxonYearKey);
        seenCanonicalTaxonomicOrderYears.add(taxonYearKey);
    });
    return sortedObservations;
};
exports.annotateData = annotateData;
var getCalibrationForObservation = function (scope, observation) {
    var taxonOrder = observation.canonicalTaxonomicOrder;
    if (!taxonOrder)
        return null;
    var countableSpecies = scope.countableTaxonOrders.has(taxonOrder);
    var nonCountableSpecies = scope.nonCountableTaxonOrders.has(taxonOrder);
    if (!countableSpecies && !nonCountableSpecies)
        return null;
    var exactTaxon = scope.taxa.find(function (taxon) {
        return taxon.submissionId === observation.submissionId && taxon.taxonOrder === taxonOrder;
    });
    var taxonExplanation = exactTaxon !== null && exactTaxon !== void 0 ? exactTaxon : scope.taxa.find(function (taxon) { return taxon.taxonOrder === taxonOrder; });
    return {
        source: 'list-export',
        scope: scope.scope,
        year: scope.year,
        taxonOrder: taxonOrder,
        countableSpecies: countableSpecies,
        countableRepresentative: false,
        exotic: taxonExplanation === null || taxonExplanation === void 0 ? void 0 : taxonExplanation.exotic,
        category: taxonExplanation === null || taxonExplanation === void 0 ? void 0 : taxonExplanation.category,
        listEntry: taxonExplanation
    };
};
var setObservationCalibration = function (observation, calibration) {
    if (!observation.calibration) {
        observation.calibration = {};
    }
    if (calibration.scope === 'life') {
        observation.calibration.life = calibration;
        return;
    }
    if (!observation.calibration.years) {
        observation.calibration.years = {};
    }
    observation.calibration.years[calibration.year.toString()] = calibration;
};
var getObservationCalibration = function (observation, scope) {
    var _a, _b, _c, _d, _e;
    if (scope.scope === 'life') {
        return (_b = (_a = observation.calibration) === null || _a === void 0 ? void 0 : _a.life) !== null && _b !== void 0 ? _b : null;
    }
    return (_e = (_d = (_c = observation.calibration) === null || _c === void 0 ? void 0 : _c.years) === null || _d === void 0 ? void 0 : _d[scope.year.toString()]) !== null && _e !== void 0 ? _e : null;
};
var calibrateScope = function (scope, observations, observationsByKey) {
    var diagnostics = [];
    var scopedObservations = observations.filter(function (observation) {
        return scope.scope === 'life' || observation.observedYear === scope.year;
    });
    scopedObservations.forEach(function (observation) {
        var calibration = getCalibrationForObservation(scope, observation);
        if (calibration) {
            setObservationCalibration(observation, calibration);
        }
    });
    var countableObservations = [];
    var seenTaxonOrders = new Set();
    scope.countableTaxa.forEach(function (taxon) {
        var _a;
        if (seenTaxonOrders.has(taxon.taxonOrder)) {
            diagnostics.push({
                code: 'duplicate-countable-taxon',
                message: "Duplicate countable taxon ".concat(taxon.taxonOrder, " in ").concat(scope.scope).concat(scope.year ? " ".concat(scope.year) : ''),
                scope: scope.scope,
                year: scope.year,
                severity: 'warning'
            });
            return;
        }
        seenTaxonOrders.add(taxon.taxonOrder);
        var exactKey = taxon.submissionId
            ? getCalibrationObservationKey(taxon.submissionId, taxon.taxonOrder)
            : null;
        var matchedObservation = exactKey ? (_a = observationsByKey.get(exactKey)) === null || _a === void 0 ? void 0 : _a[0] : null;
        var matchedBy = matchedObservation
            ? 'submission-canonical'
            : null;
        if (!matchedObservation) {
            matchedObservation = scopedObservations.find(function (observation) {
                return observation.canonicalTaxonomicOrder === taxon.taxonOrder;
            });
            matchedBy = matchedObservation ? 'canonical-fallback' : null;
            diagnostics.push({
                code: matchedObservation ? 'countable-taxon-fallback' : 'countable-taxon-unmatched',
                message: matchedObservation
                    ? "Matched countable taxon ".concat(taxon.taxonOrder, " by canonical taxon only")
                    : "Unable to match countable taxon ".concat(taxon.taxonOrder, " to an observation"),
                scope: scope.scope,
                year: scope.year,
                severity: matchedObservation ? 'warning' : 'error'
            });
        }
        if (!matchedObservation)
            return;
        var existingCalibration = getObservationCalibration(matchedObservation, scope);
        var representativeCalibration = __assign(__assign({}, (existingCalibration !== null && existingCalibration !== void 0 ? existingCalibration : {
            source: 'list-export',
            scope: scope.scope,
            year: scope.year,
            taxonOrder: taxon.taxonOrder,
            countableSpecies: true,
            countableRepresentative: false
        })), { countableSpecies: true, countableRepresentative: true, matchedBy: matchedBy, listEntry: taxon });
        setObservationCalibration(matchedObservation, representativeCalibration);
        countableObservations.push(matchedObservation);
    });
    return {
        scope: scope.scope,
        year: scope.year,
        region: scope.region,
        countableSpeciesCount: scope.countableSpeciesCount,
        countableTaxonOrders: scope.countableTaxonOrders,
        countableObservations: countableObservations.sort(ebirdSortFunction),
        diagnostics: diagnostics
    };
};
var calibrateSightings = function (annotatedData, calibration) {
    var _a;
    var calibratedObservations = annotatedData.map(function (observation) { return (__assign({}, observation)); });
    var observationsByKey = new Map();
    calibratedObservations.forEach(function (observation) {
        var _a;
        if (!observation.submissionId || !observation.canonicalTaxonomicOrder)
            return;
        var key = getCalibrationObservationKey(observation.submissionId, observation.canonicalTaxonomicOrder);
        var observationsForKey = (_a = observationsByKey.get(key)) !== null && _a !== void 0 ? _a : [];
        observationsForKey.push(observation);
        observationsByKey.set(key, observationsForKey);
    });
    var result = {
        observations: calibratedObservations,
        years: {},
        diagnostics: __spreadArray([], calibration.diagnostics, true)
    };
    if (calibration.life) {
        result.life = calibrateScope(calibration.life, calibratedObservations, observationsByKey);
        (_a = result.diagnostics).push.apply(_a, result.life.diagnostics);
    }
    Object.keys(calibration.years).forEach(function (year) {
        var _a;
        result.years[year] = calibrateScope(calibration.years[year], calibratedObservations, observationsByKey);
        (_a = result.diagnostics).push.apply(_a, result.years[year].diagnostics);
    });
    return result;
};
exports.calibrateSightings = calibrateSightings;
var getCalibratedObservations = function (calibrationResult, filterYear) {
    var _a, _b, _c, _d;
    if (filterYear === 'life') {
        return (_b = (_a = calibrationResult.life) === null || _a === void 0 ? void 0 : _a.countableObservations) !== null && _b !== void 0 ? _b : [];
    }
    return (_d = (_c = calibrationResult.years[filterYear.toString()]) === null || _c === void 0 ? void 0 : _c.countableObservations) !== null && _d !== void 0 ? _d : [];
};
exports.getCalibratedObservations = getCalibratedObservations;
exports.getCalibratedObservationsByTimePeriod = exports.getCalibratedObservations;
var getCalibratedObservationsBySpecies = function (calibrationResult, filterYear) {
    var speciesList = [];
    (0, exports.getCalibratedObservations)(calibrationResult, filterYear).forEach(function (observation) {
        if (!observation.canonicalTaxonomicOrder)
            return;
        var reportAs = canonicalizeObservationForReporting(observation);
        var foundSpecies = speciesList.find(function (species) { return species.taxonomicOrder === reportAs.taxonomicOrder; });
        if (foundSpecies) {
            foundSpecies.observations.push(observation);
        }
        else {
            speciesList.push({
                taxonomicOrder: reportAs.taxonomicOrder,
                commonName: reportAs.commonName,
                observations: [observation]
            });
        }
    });
    return speciesList;
};
exports.getCalibratedObservationsBySpecies = getCalibratedObservationsBySpecies;
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
        if (yearMatches && monthMatches && (0, exports.isSpeciesLevelObservation)(row)) {
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
            if (accumulator.canonicalTaxonomicOrder !== current.canonicalTaxonomicOrder) {
                return [accumulator, current];
            }
            return [accumulator];
        }
        var found = accumulator.findIndex(function (el) { return el.canonicalTaxonomicOrder === current.canonicalTaxonomicOrder; });
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
        var sortedFirstObservations = firstObservations
            .map(canonicalizeObservationForReporting)
            .sort(ebirdSortFunction);
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
var getEBirdObservationTimestamp = function (date, time) {
    if (!date) {
        return Number.MAX_SAFE_INTEGER;
    }
    var normalizedTime = getNormalizedEBirdTime(time);
    var timestamp = new Date("".concat(date, "T").concat(normalizedTime)).getTime();
    return isNaN(timestamp) ? Number.MAX_SAFE_INTEGER : timestamp;
};
var getNormalizedEBirdTime = function (time) {
    var _a;
    if (!time) {
        return '00:00';
    }
    var trimmedTime = time.trim();
    var timeParts = trimmedTime.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?$/i);
    if (!timeParts) {
        return trimmedTime;
    }
    var hours = parseInt(timeParts[1]);
    var minutes = timeParts[2];
    var seconds = timeParts[3];
    var meridiem = (_a = timeParts[4]) === null || _a === void 0 ? void 0 : _a.toUpperCase();
    if (meridiem === 'AM' && hours === 12) {
        hours = 0;
    }
    else if (meridiem === 'PM' && hours < 12) {
        hours += 12;
    }
    var normalizedHours = hours < 10 ? "0".concat(hours) : hours.toString();
    return seconds ? "".concat(normalizedHours, ":").concat(minutes, ":").concat(seconds) : "".concat(normalizedHours, ":").concat(minutes);
};
var ebirdSortFunction = function (a, b) {
    var dateA = getObservationTimestamp(a);
    var dateB = getObservationTimestamp(b);
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
    return getEBirdObservationTimestamp(observation.date, observation.time);
};
/**
 *
 * @param {EBirdMyDataSchema[]} annotatedData
 * @returns EBirdObservationsBySpecies[]
 */
var getObservationsBySpecies = function (annotatedData) {
    var speciesList = [];
    var _loop_1 = function (row) {
        if (!row.canonicalTaxonomicOrder)
            return "continue";
        if (!(0, exports.isSpeciesLevelObservation)(row))
            return "continue";
        var reportAs = canonicalizeObservationForReporting(row);
        var foundSpecies = speciesList.find(function (el) { return el.taxonomicOrder === reportAs.taxonomicOrder; });
        if (foundSpecies) {
            foundSpecies.observations.push(reportAs);
        }
        else {
            speciesList.push({
                taxonomicOrder: reportAs.taxonomicOrder,
                commonName: reportAs.commonName,
                observations: [reportAs]
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
var speciesMetadataByTaxonomicOrder = new Map();
var canonicalTaxonomicOrderByTaxonomicOrder = new Map();
speciesTaxonomy.forEach(function (species) {
    var _a;
    speciesMetadataByTaxonomicOrder.set(species.order, species);
    canonicalTaxonomicOrderByTaxonomicOrder.set(species.order, species.order);
    (_a = species.alternateTaxonomicOrders) === null || _a === void 0 ? void 0 : _a.forEach(function (alternateTaxonomicOrder) {
        speciesMetadataByTaxonomicOrder.set(alternateTaxonomicOrder, species);
        canonicalTaxonomicOrderByTaxonomicOrder.set(alternateTaxonomicOrder, species.order);
    });
});
var getCanonicalTaxonomicOrder = function (taxonomicOrder) {
    var _a;
    return (_a = canonicalTaxonomicOrderByTaxonomicOrder.get(taxonomicOrder)) !== null && _a !== void 0 ? _a : taxonomicOrder;
};
var getSpeciesReportMetadata = function (taxonomicOrder) {
    var _a;
    return (_a = speciesMetadataByTaxonomicOrder.get(taxonomicOrder)) !== null && _a !== void 0 ? _a : null;
};
var canonicalizeObservationForReporting = function (observation) {
    var _a, _b;
    var reportAsTaxonomicOrder = (_b = (_a = observation.reportAsTaxonomicOrder) !== null && _a !== void 0 ? _a : observation.canonicalTaxonomicOrder) !== null && _b !== void 0 ? _b : observation.taxonomicOrder;
    var reportAs = getSpeciesReportMetadata(reportAsTaxonomicOrder);
    if (!reportAs) {
        return observation;
    }
    return __assign(__assign({}, observation), { taxonomicOrder: reportAs.order, commonName: reportAs.commonName, scientificName: reportAs.scientificName, canonicalTaxonomicOrder: reportAs.order, reportAsTaxonomicOrder: reportAs.order, reportAsCommonName: reportAs.commonName, reportAsScientificName: reportAs.scientificName, baseScientificName: reportAs.scientificName });
};
var getChecklistByFamily = function (observationsBySpecies, baseChecklist) {
    var _a;
    var checklist = baseChecklist !== null && baseChecklist !== void 0 ? baseChecklist : JSON.parse(JSON.stringify(emptyChecklist));
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
    generateBookmarklet: exports.generateBookmarklet,
    parseCountabilityBundle: exports.parseCountabilityBundle,
    calibrateSightings: exports.calibrateSightings,
    getCalibratedObservations: exports.getCalibratedObservations,
    getCalibratedObservationsByTimePeriod: exports.getCalibratedObservationsByTimePeriod,
    getCalibratedObservationsBySpecies: exports.getCalibratedObservationsBySpecies,
    getFilteredObservations: exports.getFilteredObservations,
    getObservationsBySpecies: exports.getObservationsBySpecies,
    getObservationsByLocation: exports.getObservationsByLocation,
    getMonthsWithObservations: exports.getMonthsWithObservations
};
