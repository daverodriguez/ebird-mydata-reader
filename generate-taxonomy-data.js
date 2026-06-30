const Papa = require('papaparse');
const {readFileSync, writeFileSync} = require('fs');
const path = require('path');
const speciesImagesPath = process.env.SPECIES_IMAGES_FILE || './src/data/species-images-2025.json';
const speciesImages = require(path.resolve(speciesImagesPath));
const {Encoder} = require("@toondepauw/node-zstd");
const {Buffer} = require("node:buffer");

const shrink = async () => {
    const TAX_FILE = './src/data/eBird_taxonomy_v2025.csv';
    const CLEMENTS_TAX_FILE = './src/data/eBird-Clements_v2025-integrated-checklist-October-2025.csv';
    const taxFile = readFileSync(TAX_FILE, {
        encoding: 'utf8'
    });
    const clementsTaxFile = readFileSync(CLEMENTS_TAX_FILE, {
        encoding: 'utf8'
    });

    const options = {
        header: true,
        transformHeader: (headerText) => {
            return headerText.replace(/\s/g, '');
        },
        dynamicTyping: true
    }

    const jsonFile = Papa.parse(taxFile, options);
    const jsonData = jsonFile.data;
    const clementsJsonFile = Papa.parse(clementsTaxFile, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true
    });
    const clementsData = clementsJsonFile.data;
    const clementsBySpeciesCode = new Map(clementsData.map(row => [row.species_code, row]));
    const clementsFamilyByName = new Map(
        clementsData
            .filter(row => row.category === 'family')
            .map(row => [row.family, row])
    );
    const alternateSpeciesCodesByReportAs = new Map();
    const alternateTaxonomicOrdersByReportAs = new Map();

    for (const row of jsonData) {
        if (!row.REPORT_AS) {
            continue;
        }

        if (!alternateSpeciesCodesByReportAs.has(row.REPORT_AS)) {
            alternateSpeciesCodesByReportAs.set(row.REPORT_AS, []);
        }

        if (!alternateTaxonomicOrdersByReportAs.has(row.REPORT_AS)) {
            alternateTaxonomicOrdersByReportAs.set(row.REPORT_AS, []);
        }

        alternateSpeciesCodesByReportAs.get(row.REPORT_AS).push(row.SPECIES_CODE);
        alternateTaxonomicOrdersByReportAs.get(row.REPORT_AS).push(row.TAXON_ORDER);
    }

    const getFamilyDetails = (familyName) => {
        const familyData = clementsFamilyByName.get(familyName);
        if (familyData) {
            return {
                familyScientific: familyData['scientific name'],
                familyCommon: familyData['English name']
            };
        }

        const familyMatches = familyName?.match(/^(.+?) \((.+)\)$/);
        return {
            familyScientific: familyMatches?.[1] ?? familyName,
            familyCommon: familyMatches?.[2] ?? familyName
        };
    };

    const shrunkTaxonomy = [];
    const speciesTaxonomy = [];
    for (let row of jsonData) {
        // if (row.CATEGORY !== 'species') { continue; }

        shrunkTaxonomy.push({
           O: row.TAXON_ORDER,
           // SCI: row.SCI_NAME,
           FAM: row.SPECIES_GROUP
        });

        if (row.CATEGORY === 'species') {
            const clementsRow = clementsBySpeciesCode.get(row.SPECIES_CODE);
            const familyDetails = getFamilyDetails(row.FAMILY);
            speciesTaxonomy.push({
                order: row.TAXON_ORDER,
                family: row.FAMILY,
                familyScientific: familyDetails.familyScientific,
                familyCommon: familyDetails.familyCommon,
                familyShort: row.SPECIES_GROUP,
                genus: row.SCI_NAME.split(' ')[0],
                scientificName: row.SCI_NAME,
                commonName: row.PRIMARY_COM_NAME,
                speciesCode: row.SPECIES_CODE,
                alternateSpeciesCodes: alternateSpeciesCodesByReportAs.get(row.SPECIES_CODE) ?? [],
                alternateTaxonomicOrders: alternateTaxonomicOrdersByReportAs.get(row.SPECIES_CODE) ?? [],
                isExtinct: clementsRow?.extinct === 1,
                range: clementsRow?.range ?? ''
            });
        }
    }

    writeFileSync('src/data/shrunk-taxonomy.csv', Papa.unparse(shrunkTaxonomy));
    writeFileSync('src/data/shrunk-taxonomy.json', JSON.stringify(shrunkTaxonomy));
    writeFileSync('src/data/species-taxonomy.json', JSON.stringify(speciesTaxonomy));

    const rangedTaxonomy = [];
    let min = null, i = 0;
    let last = null, lastFamily = null;

    for (let row of jsonData) {
        if (!row.FAMILY) {
            continue;
        }

        if (!min) {
            min = last ?? row.TAXON_ORDER;
        }

        if (lastFamily && row.FAMILY !== lastFamily) {
            const familyDetails = getFamilyDetails(lastFamily);
            rangedTaxonomy.push({
                min: min,
                max: last,
                fam: lastFamily,
                familyScientific: familyDetails.familyScientific,
                familyCommon: familyDetails.familyCommon
            });

            min = null;
        }

        last = row.TAXON_ORDER;
        lastFamily = row.FAMILY;
        i++;
    }

    if (lastFamily) {
        const familyDetails = getFamilyDetails(lastFamily);
        rangedTaxonomy.push({
            min: min,
            max: last,
            fam: lastFamily,
            familyScientific: familyDetails.familyScientific,
            familyCommon: familyDetails.familyCommon
        });
    }

    // console.log(rangedTaxonomy);
    writeFileSync('src/data/ranged-taxonomy.json', JSON.stringify(rangedTaxonomy));

    const familyTaxonomy = [];
    min = null;
    last = null;
    lastFamily = null;

    for (let row of speciesTaxonomy) {
        if (!min) {
            min = last ?? row.order;
        }

        if (lastFamily && row.family !== lastFamily) {
            const familyDetails = getFamilyDetails(lastFamily);
            familyTaxonomy.push({
                min: min,
                max: last,
                fam: lastFamily,
                familyScientific: familyDetails.familyScientific,
                familyCommon: familyDetails.familyCommon
            });

            min = null;
        }

        last = row.order;
        lastFamily = row.family;
        i++;
    }

    const familyDetails = getFamilyDetails(lastFamily);
    familyTaxonomy.push({
        min: min,
        max: last,
        fam: lastFamily,
        familyScientific: familyDetails.familyScientific,
        familyCommon: familyDetails.familyCommon
    });

    // console.log(rangedTaxonomy);
    writeFileSync('src/data/family-taxonomy.json', JSON.stringify(familyTaxonomy));

    const initFamilyFromTaxonomy = (species) => {
        return {
            familyName: species.family,
            familyScientific: species.familyScientific,
            familyCommon: species.familyCommon,
            seen: false,
            totalCount: 0,
            seenCount: 0,
            speciesList: [],
            firstObservation: null
        }
    }

    const checklist = [];
    const familyRanges = familyTaxonomy;
    let upperBound = familyRanges[0].max;
    let familyCounter = 0;
    let currentTaxonCode = 0;
    checklist.push(initFamilyFromTaxonomy(speciesTaxonomy[0]));

    for (const currentSpecies of speciesTaxonomy) {
        currentTaxonCode = currentSpecies.order;

        if (currentTaxonCode > upperBound) {
            // console.log('New family found at taxon position ' + currentTaxonCode);
            // console.log('New family is ' + currentSpecies.family);
            if (familyRanges.length > familyCounter + 1) {
                familyCounter++;
                upperBound = familyRanges[familyCounter].max;
                checklist.push(initFamilyFromTaxonomy(currentSpecies));
            }
        }

        const speciesData = {
            taxonomicOrder: currentTaxonCode,
            scientificName: currentSpecies.scientificName,
            commonName: currentSpecies.commonName,
            speciesCode: currentSpecies.speciesCode,
            alternateSpeciesCodes: currentSpecies.alternateSpeciesCodes,
            alternateTaxonomicOrders: currentSpecies.alternateTaxonomicOrders,
            familyScientific: currentSpecies.familyScientific,
            familyCommon: currentSpecies.familyCommon,
            isExtinct: currentSpecies.isExtinct,
            range: currentSpecies.range,
            seen: false,
            firstObservation: null
        };


        if (speciesImages.hasOwnProperty(currentTaxonCode)) {
            speciesData.image = speciesImages[currentTaxonCode];
        }

        checklist[familyCounter].speciesList.push(speciesData);
        checklist[familyCounter].totalCount++;
    }

    writeFileSync('src/data/empty-checklist.json', JSON.stringify(checklist));

    // Compress all files
    const ZstdEncoder = new Encoder(5);
    const compressedShrunkTaxonomy = await ZstdEncoder.encode(Buffer.from(JSON.stringify(shrunkTaxonomy)));
    writeFileSync('src/data/shrunk-taxonomy.json.zs', compressedShrunkTaxonomy);

    const compressedSpeciesTaxonomy = await ZstdEncoder.encode(Buffer.from(JSON.stringify(speciesTaxonomy)));
    writeFileSync('src/data/species-taxonomy.json.zs', JSON.stringify(compressedSpeciesTaxonomy));

    const compressedRangedTaxonomy = await ZstdEncoder.encode(Buffer.from(JSON.stringify(rangedTaxonomy)));
    writeFileSync('src/data/ranged-taxonomy.json.zs', JSON.stringify(compressedRangedTaxonomy));

    const compressedFamilyTaxonomy = await ZstdEncoder.encode(Buffer.from(JSON.stringify(familyTaxonomy)));
    writeFileSync('src/data/family-taxonomy.json.zs', JSON.stringify(compressedFamilyTaxonomy));

    const compressedEmptyChecklist = await ZstdEncoder.encode(Buffer.from(JSON.stringify(checklist)));
    writeFileSync('src/data/empty-checklist.json.zs', JSON.stringify(compressedEmptyChecklist));
}

shrink();
