const {readFileSync} = require('fs');
const Papa = require('papaparse');

const loadSpecies = (taxonomyPath) => {
    const csv = readFileSync(taxonomyPath, 'utf8');
    const parsed = Papa.parse(csv, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true
    });

    if (parsed.errors.length) {
        const firstError = parsed.errors[0];
        throw new Error(`Failed to parse taxonomy CSV at row ${firstError.row}: ${firstError.message}`);
    }

    return parsed.data
        .filter(row => row.CATEGORY === 'species')
        .map(row => ({
            taxonomicOrder: row.TAXON_ORDER,
            commonName: row.PRIMARY_COM_NAME,
            scientificName: row.SCI_NAME,
            speciesCode: row.SPECIES_CODE,
            family: row.FAMILY,
            order: row.ORDER,
            speciesGroup: row.SPECIES_GROUP
        }));
};

const selectSpecies = (species, args) => {
    if (args.species) {
        const selected = species.find(row => row.speciesCode === args.species);
        if (!selected) {
            throw new Error(`No species found for species code "${args.species}"`);
        }
        return [selected];
    }

    if (args.family) {
        const familySearch = args.family.toLowerCase();
        const selected = species.filter(row => row.family?.toLowerCase().includes(familySearch));
        if (!selected.length) {
            throw new Error(`No species found for family search "${args.family}"`);
        }
        return selected;
    }

    if (args.all) {
        return species;
    }

    throw new Error('Choose a scope with --species <code>, --family <name>, or --all');
};

module.exports = {
    loadSpecies,
    selectSpecies
};
