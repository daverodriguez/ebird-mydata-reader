const https = require('https');

const DEFAULT_USER_AGENT = 'ebird-mydata-reader-image-pipeline/0.1 (https://github.com/ohiodave/ebird-mydata-reader)';

const getJson = (url, options = {}) => {
    return new Promise((resolve, reject) => {
        const request = https.get(url, {
            headers: {
                'Accept': 'application/json',
                'User-Agent': options.userAgent ?? DEFAULT_USER_AGENT
            }
        }, (response) => {
            if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                response.resume();
                resolve(getJson(new URL(response.headers.location, url).toString(), options));
                return;
            }

            let body = '';
            response.setEncoding('utf8');
            response.on('data', chunk => body += chunk);
            response.on('end', () => {
                if (response.statusCode < 200 || response.statusCode >= 300) {
                    reject(new Error(`GET ${url} failed with HTTP ${response.statusCode}: ${body.slice(0, 300)}`));
                    return;
                }

                try {
                    resolve(JSON.parse(body));
                } catch (error) {
                    reject(new Error(`GET ${url} returned invalid JSON: ${error.message}`));
                }
            });
        });

        request.on('error', reject);
        request.setTimeout(options.timeoutMs ?? 30000, () => {
            request.destroy(new Error(`GET ${url} timed out`));
        });
    });
};

const getBuffer = (url, options = {}) => {
    return new Promise((resolve, reject) => {
        const request = https.get(url, {
            headers: {
                'User-Agent': options.userAgent ?? DEFAULT_USER_AGENT
            }
        }, (response) => {
            if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                response.resume();
                resolve(getBuffer(new URL(response.headers.location, url).toString(), options));
                return;
            }

            const chunks = [];
            response.on('data', chunk => chunks.push(chunk));
            response.on('end', () => {
                const body = Buffer.concat(chunks);
                if (response.statusCode < 200 || response.statusCode >= 300) {
                    reject(new Error(`GET ${url} failed with HTTP ${response.statusCode}: ${body.toString('utf8', 0, 300)}`));
                    return;
                }

                resolve({
                    buffer: body,
                    contentType: response.headers['content-type'] ?? null
                });
            });
        });

        request.on('error', reject);
        request.setTimeout(options.timeoutMs ?? 60000, () => {
            request.destroy(new Error(`GET ${url} timed out`));
        });
    });
};

module.exports = {
    getJson,
    getBuffer
};
