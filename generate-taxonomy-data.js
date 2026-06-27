const Papa = require('papaparse');
const {readFileSync, writeFileSync} = require('fs');
const speciesImages = require("./src/data/species-images-2025.json");
const {Encoder} = require("@toondepauw/node-zstd");
const {Buffer} = require("node:buffer");

const shrink = async () => {
    const TAX_FILE = './src/data/eBird_taxonomy_v2025.csv';
    const taxFile = readFileSync(TAX_FILE, {
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
            speciesTaxonomy.push({
                order: row.TAXON_ORDER,
                family: row.FAMILY,
                familyShort: row.SPECIES_GROUP,
                genus: row.SCI_NAME.split(' ')[0],
                scientificName: row.SCI_NAME,
                commonName: row.PRIMARY_COM_NAME,
                speciesCode: row.SPECIES_CODE
            });
        }
    }

    writeFileSync('src/data/shrunk-taxonomy.csv', Papa.unparse(shrunkTaxonomy));
    writeFileSync('src/data/shrunk-taxonomy.json', JSON.stringify(shrunkTaxonomy));
    writeFileSync('src/data/species-taxonomy.json', JSON.stringify(speciesTaxonomy));

    const rangedTaxonomy = [];
    let min = null, i = 0;
    let last = null, lastGroup = null;

    for (let row of jsonData) {
        if (!min) {
            min = last ?? row.TAXON_ORDER;
        }

        if (lastGroup && row.SPECIES_GROUP !== lastGroup) {
            rangedTaxonomy.push({
                min: min,
                max: last,
                fam: lastGroup
            });

            min = null;
        }

        last = row.TAXON_ORDER;
        lastGroup = row.SPECIES_GROUP;
        i++;
    }

    // console.log(rangedTaxonomy);
    writeFileSync('src/data/ranged-taxonomy.json', JSON.stringify(rangedTaxonomy));

    const familyTaxonomy = [];
    min = null, i = 0;
    last = null;
    let lastFamily = null;

    for (let row of jsonData) {
        if (!min) {
            min = last ?? row.TAXON_ORDER;
        }

        if (row.FAMILY && lastFamily && row.FAMILY !== lastFamily) {
            if (!row.FAMILY) {
                console.log('That shouldn\'t have happened', row);
            }

            familyTaxonomy.push({
                min: min,
                max: last,
                fam: lastFamily
            });

            min = null;
        }

        last = row.TAXON_ORDER;
        lastFamily = row.FAMILY;
        i++;
    }

    familyTaxonomy.push({
        min: min,
        max: last,
        fam: lastFamily
    });

    // console.log(rangedTaxonomy);
    writeFileSync('src/data/family-taxonomy.json', JSON.stringify(familyTaxonomy));

    const initFamilyFromTaxonomy = (species) => {
        return {
            familyName: species.family,
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
