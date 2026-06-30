const inaturalist = require('./inaturalist');
const gbif = require('./gbif');
const wikimedia = require('./wikimedia');

const providers = new Map([
    [inaturalist.name, inaturalist],
    [gbif.name, gbif],
    [wikimedia.name, wikimedia]
]);

const getProviders = (requestedProviders) => {
    const names = requestedProviders
        ? requestedProviders.split(',').map(name => name.trim()).filter(Boolean)
        : Array.from(providers.keys());

    return names.map(providerName => {
        const provider = providers.get(providerName);
        if (!provider) {
            throw new Error(`Unknown provider "${providerName}". Available providers: ${Array.from(providers.keys()).join(', ')}`);
        }
        return provider;
    });
};

module.exports = {
    getProviders
};
