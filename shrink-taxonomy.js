const Papa = require('papaparse');
const {readFileSync, writeFileSync} = require('fs');

const shrink = async () => {
    const TAX_FILE = './src/data/ebird_taxonomy_v2023.csv';
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
    for (let row of jsonData) {
        // if (row.CATEGORY !== 'species') { continue; }

        shrunkTaxonomy.push({
           O: row.TAXON_ORDER,
           // SCI: row.SCI_NAME,
           FAM: row.SPECIES_GROUP
        });
    }

    writeFileSync('src/data/shrunk-taxonomy.csv', Papa.unparse(shrunkTaxonomy));
    writeFileSync('src/data/shrunk-taxonomy.json', JSON.stringify(shrunkTaxonomy));

    const rangedTaxonomy = [];
    let min = null, i = 0;
    let last = null, lastFamily = null;

    for (let row of jsonData) {
        if (!min) {
            min = last ?? row.TAXON_ORDER;
        }

        if (lastFamily && row.SPECIES_GROUP !== lastFamily) {
            rangedTaxonomy.push({
                min: min,
                max: last,
                fam: lastFamily
            });

            min = null;
        }

        last = row.TAXON_ORDER;
        lastFamily = row.SPECIES_GROUP;
        i++;
    }

    console.log(rangedTaxonomy);
    writeFileSync('src/data/ranged-taxonomy.json', JSON.stringify(rangedTaxonomy));

}

shrink();