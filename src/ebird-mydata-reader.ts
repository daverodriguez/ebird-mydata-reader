import * as JSZip from "jszip";
import * as Papa from "papaparse";
import * as taxonomyRanged from './data/ranged-taxonomy.json';
import * as taxonomyFamily from './data/family-taxonomy.json';
import * as emptyChecklist from './data/empty-checklist.json';
import * as speciesTaxonomy from './data/species-taxonomy.json';

const CSV_FILENAME = 'MyEBirdData.csv';

export const isCountableSpeciesObservation = (row: EBirdMyDataSchema): boolean => {
    const scientificName = row.scientificName ?? '';
    const speciesLevelName = scientificName.split(' ').slice(0, 2).join(' ');
    return scientificName.indexOf('sp.') < 0
        && speciesLevelName.indexOf('/') < 0
        && scientificName.indexOf(' x ') < 0
        && !scientificName.match(/\(domestic/i);
}

export const isValidObservation = (row: EBirdMyDataSchema): boolean => {
    if (!row) return false;
    return !!row.date
        && !!row.commonName
        && !!row.scientificName
        && !!row.taxonomicOrder;
}

const normalizeObservation = (row: EBirdMyDataSchema): EBirdMyDataSchema => {
    if (!row) return row;
    const submissionId = row.submissionId ?? row.submissionID;
    row.submissionId = submissionId;
    row.submissionID = submissionId;
    return row;
}

/**
 * Represents a single observation of one species in eBird
 */
export type EBirdMyDataSchema = {
    submissionId: string,
    submissionID?: string,
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
    canonicalTaxonomicOrder?: number,
    isLifer?: boolean,
    isFirstOfYear?: boolean
}

/**
 * An object containing all of a user's observations for a single species
 */
export type EBirdObservationsBySpecies = {
    taxonomicOrder: number,
    commonName: string,
    observations: EBirdMyDataSchema[]
}

/**
 * An object containing all of a user's observations for a taxonomical family
 */
export type EBirdObservationsByFamily = {
    familyName: string,
    familyScientific?: string,
    familyCommon?: string,
    observations: EBirdMyDataSchema[]
}

export type EBirdChecklistByFamily = {
    familyName: string,
    familyScientific: string,
    familyCommon: string,
    seen: boolean,
    totalCount: number,
    seenCount: number,
    speciesList: EBirdChecklistBySpecies[],
    firstObservation: EBirdMyDataSchema
}

export type EBirdChecklistBySpecies = {
    taxonomicOrder: number,
    scientificName: string,
    commonName: string,
    speciesCode: string,
    alternateSpeciesCodes: string[],
    alternateTaxonomicOrders?: number[],
    familyScientific: string,
    familyCommon: string,
    isExtinct: boolean,
    range: string,
    seen: boolean,
    firstObservation: EBirdMyDataSchema,
    image?: {
        thumb?: string,
        medium?: string,
        full640?: string
    }
}

/**
 * An object containing all of a user's observations for a single location
 */
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

/**
 * Loads an eBird "My Data" ZIP file and extracts the CSV data, returning it as a string
 * @param {string|ArrayBuffer|Buffer} dataFile
 * @returns Promise<string>
 */
export const loadDataFile = async (dataFile: string | ArrayBuffer | Buffer): Promise<string> => {
    // console.log('Loading eBird data from ZIP file');
    const zip = new JSZip();

    const zipFile = await zip.loadAsync(dataFile);
    const csvFile = zipFile.file(CSV_FILENAME);
    if (csvFile) {
        const csvData = await csvFile.async('string');
        return csvData;
    }

    return null;
}

/**
 * Parses a string containing eBird observations in CSV format and returns an array of enriched data objects
 * @param {string} csvData
 * @returns EBirdMyDataSchema[]
 */
export const parseData = (csvData: string): EBirdMyDataSchema[] => {
    console.log('Parsing eBird CSV data');
    const options = {
        header: true,
        transformHeader: headerTransformFunction,
        dynamicTyping: true,
        skipEmptyLines: 'greedy'
    }

    const jsonData = Papa.parse(csvData, options);

    return annotateData(jsonData.data);
}

/**
 * Accepts an array of eBird observation objects and calculates additional information including the observed year and month,
 * the base scientific name (without subspecies), and whether the bird is the first observation ever for a user (a "lifer"),
 * or the first observation in a calendar year
 * @param {EBirdMyDataSchema[]} rawData
 */
export const annotateData = (rawData: EBirdMyDataSchema[]): EBirdMyDataSchema[] => {
    let sortedObservations = rawData.map(normalizeObservation).filter(isValidObservation).sort((a, b) => {
        const timestampA = getObservationTimestamp(a);
        const timestampB = getObservationTimestamp(b);

        if (timestampA < timestampB) return -1;
        if (timestampA > timestampB) return 1;
        if (timestampA === timestampB) {
            if (a.taxonomicOrder < b.taxonomicOrder) return -1;
            if (a.taxonomicOrder > b.taxonomicOrder) return 1;
            return 0;
        }
    });

    const seenCanonicalTaxonomicOrders = new Set<number>();
    const seenCanonicalTaxonomicOrderYears = new Set<string>();

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

        obs.canonicalTaxonomicOrder = getCanonicalTaxonomicOrder(obs.taxonomicOrder);

        obs.isLifer = !seenCanonicalTaxonomicOrders.has(obs.canonicalTaxonomicOrder);
        seenCanonicalTaxonomicOrders.add(obs.canonicalTaxonomicOrder);

        const taxonYearKey = `${obs.canonicalTaxonomicOrder}:${obs.observedYear}`;
        obs.isFirstOfYear = !seenCanonicalTaxonomicOrderYears.has(taxonYearKey);
        seenCanonicalTaxonomicOrderYears.add(taxonYearKey);

    });

    return sortedObservations;
}

/**
 *
 * @param annotatedData
 * @param filterYear
 * @param filterMonth
 * @param getAllObservations
 * @returns EBirdMyDataSchema[]
 */
export const getFilteredObservations = (
    annotatedData: EBirdMyDataSchema[],
    filterYear: number | "life",
    filterMonth?: number,
    getAllObservations = false
    ): EBirdMyDataSchema[] => {
    let filteredObservations = [];
    for (let row of annotatedData) {
        if (!row.date) continue;

        const [tmpYear, tmpMonth] = row.date.split('-');
        const year = parseInt(tmpYear);
        const month = parseInt(tmpMonth);

        const yearMatches = filterYear === "life" || year === filterYear;
        const monthMatches = !filterMonth || month === filterMonth;
        if (yearMatches && monthMatches && isCountableSpeciesObservation(row)) {
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

/**
 *
 * @param annotatedData
 * @param filterYear
 * @returns number[]
 */
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

const getEBirdObservationTimestamp = (date: string, time?: string): number => {
    if (!date) {
        return Number.MAX_SAFE_INTEGER;
    }

    const normalizedTime = getNormalizedEBirdTime(time);
    const timestamp = new Date(`${date}T${normalizedTime}`).getTime();
    return isNaN(timestamp) ? Number.MAX_SAFE_INTEGER : timestamp;
}

const getNormalizedEBirdTime = (time?: string): string => {
    if (!time) {
        return '00:00';
    }

    const trimmedTime = time.trim();
    const timeParts = trimmedTime.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?$/i);
    if (!timeParts) {
        return trimmedTime;
    }

    let hours = parseInt(timeParts[1]);
    const minutes = timeParts[2];
    const seconds = timeParts[3];
    const meridiem = timeParts[4]?.toUpperCase();

    if (meridiem === 'AM' && hours === 12) {
        hours = 0;
    } else if (meridiem === 'PM' && hours < 12) {
        hours += 12;
    }

    const normalizedHours = hours < 10 ? `0${hours}` : hours.toString();
    return seconds ? `${normalizedHours}:${minutes}:${seconds}` : `${normalizedHours}:${minutes}`;
}

const ebirdSortFunction = (a, b) => {
    const dateA = getObservationTimestamp(a);
    const dateB = getObservationTimestamp(b);

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

const getObservationTimestamp = (observation: EBirdMyDataSchema): number => {
    return getEBirdObservationTimestamp(observation.date, observation.time);
}

/**
 *
 * @param {EBirdMyDataSchema[]} annotatedData
 * @returns EBirdObservationsBySpecies[]
 */
export const getObservationsBySpecies = (annotatedData: EBirdMyDataSchema[]): EBirdObservationsBySpecies[] => {
    const speciesList = [];

    for (const row of annotatedData) {
        if (!row.taxonomicOrder) continue;
        if (!isCountableSpeciesObservation(row)) continue;

        const foundSpecies = speciesList.find(el => el.taxonomicOrder === row.taxonomicOrder);

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

/**
 *
 * @param {EBirdMyDataSchema[]} annotatedData
 * @returns EBirdObservationsByFamily[]
 */
export const getObservationsByFamily = (annotatedData: EBirdMyDataSchema[]): EBirdObservationsByFamily[] => {
    let taxonomy = taxonomyRanged;
    const familyList = [];

    for (const row of annotatedData) {
        if (!row.taxonomicOrder) continue;

        const foundFamily = taxonomy.find(el => row.taxonomicOrder >= el.min && row.taxonomicOrder <= el.max);
        if (!foundFamily) { continue; }

        const foundSpeciesInFamily = familyList.find(el => el.familyName === foundFamily.fam);

        if (foundSpeciesInFamily) {
            foundSpeciesInFamily.observations.push(row);
        } else {
            familyList.push({
                familyName: foundFamily.fam,
                familyScientific: foundFamily.familyScientific,
                familyCommon: foundFamily.familyCommon,
                observations: [row]
            });
        }
    }

    return familyList;
}

type SpeciesTaxonomyEntry = {
    order: number,
    family: string,
    genus: string,
    scientificName: string,
    commonName: string,
    speciesCode: string,
    alternateSpeciesCodes?: string[],
    alternateTaxonomicOrders?: number[],
};

const canonicalTaxonomicOrderByTaxonomicOrder = new Map<number, number>();

(speciesTaxonomy as SpeciesTaxonomyEntry[]).forEach((species: SpeciesTaxonomyEntry) => {
    canonicalTaxonomicOrderByTaxonomicOrder.set(species.order, species.order);
    species.alternateTaxonomicOrders?.forEach((alternateTaxonomicOrder) => {
        canonicalTaxonomicOrderByTaxonomicOrder.set(alternateTaxonomicOrder, species.order);
    });
});

const getCanonicalTaxonomicOrder = (taxonomicOrder: number): number => {
    return canonicalTaxonomicOrderByTaxonomicOrder.get(taxonomicOrder) ?? taxonomicOrder;
}

export const getChecklistByFamily = (observationsBySpecies: EBirdObservationsBySpecies[]): EBirdChecklistByFamily[] => {
    const checklist = JSON.parse(JSON.stringify(emptyChecklist));

    const locateSpeciesAndFamilyInFamilyList = (taxonomicOrder: number) => {
        const foundFamilyIndex = taxonomyFamily.findIndex(el => taxonomicOrder >= el.min && taxonomicOrder <= el.max);
        // console.log(foundFamilyIndex);

        if (foundFamilyIndex >= 0) {
            const foundFamily = checklist[foundFamilyIndex];
            if (foundFamily) {
                const foundSpecies = foundFamily.speciesList.find(el => {
                    return el.taxonomicOrder === taxonomicOrder || el.alternateTaxonomicOrders?.includes(taxonomicOrder);
                });
                if (foundSpecies) {
                    return {
                        family: foundFamily,
                        species: foundSpecies
                    }
                }
            }
        }

        return {
            family: null,
            species: null
        };
    }

    for (const currentSpecies of observationsBySpecies) {
        const { family, species } = locateSpeciesAndFamilyInFamilyList(currentSpecies.taxonomicOrder);
        if (species && family) {
            const firstObservation = currentSpecies.observations?.length
                ? currentSpecies.observations.reduce((earliest, observation) => {
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
}

/**
 *
 * @param {EBirdMyDataSchema[]} annotatedData
 */
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
