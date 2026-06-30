const {getJson} = require('../http');
const {makeCandidateId} = require('../ids');

const name = 'wikimedia';

const COMMONS_API = 'https://commons.wikimedia.org/w/api.php';

const cleanText = (value) => {
    if (!value) {
        return null;
    }

    return String(value)
        .replace(/<[^>]*>/g, '')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#039;/g, "'")
        .replace(/&nbsp;/g, ' ')
        .trim();
};

const parseImageInfo = (page) => {
    const info = page.imageinfo?.[0];
    if (!info?.url) {
        return null;
    }

    const metadata = new Map((info.extmetadata ? Object.entries(info.extmetadata) : [])
        .map(([key, value]) => [key, value?.value ?? null]));

    const sourceUrl = info.descriptionurl
        ?? `https://commons.wikimedia.org/wiki/${encodeURIComponent(page.title.replace(/ /g, '_'))}`;

    return {
        sourceUrl,
        imageUrl: info.url,
        thumbnailUrl: info.thumburl ?? info.url,
        photographer: cleanText(metadata.get('Artist')),
        license: cleanText(metadata.get('LicenseShortName') ?? metadata.get('License')),
        attribution: cleanText(metadata.get('Attribution') ?? metadata.get('Artist')),
        originalWidth: info.width ?? null,
        originalHeight: info.height ?? null
    };
};

const searchSpecies = async (species, options) => {
    const searchUrl = new URL(COMMONS_API);
    searchUrl.searchParams.set('action', 'query');
    searchUrl.searchParams.set('format', 'json');
    searchUrl.searchParams.set('generator', 'search');
    searchUrl.searchParams.set('gsrnamespace', '6');
    searchUrl.searchParams.set('gsrsearch', `${species.scientificName} ${species.commonName}`);
    searchUrl.searchParams.set('gsrlimit', String(options.limit * 2));
    searchUrl.searchParams.set('prop', 'imageinfo');
    searchUrl.searchParams.set('iiprop', 'url|size|mime|extmetadata');
    searchUrl.searchParams.set('iiurlwidth', '512');

    const response = await getJson(searchUrl.toString());
    const pages = Object.values(response.query?.pages ?? {});
    const candidates = [];

    for (const page of pages) {
        const info = parseImageInfo(page);
        if (!info) {
            continue;
        }

        candidates.push({
            id: makeCandidateId(name, page.title),
            speciesCode: species.speciesCode,
            source: name,
            ...info,
            providerRank: candidates.length + 1,
            retrievedAt: new Date().toISOString(),
            raw: {
                pageId: page.pageid,
                title: page.title
            }
        });

        if (candidates.length >= options.limit) {
            break;
        }
    }

    return candidates;
};

module.exports = {
    name,
    searchSpecies
};
