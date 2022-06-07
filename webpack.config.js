const path = require('path');

module.exports = {
    entry: {
        'ebird-mydata-reader': './src/ebird-mydata-reader.ts',
        'test-web': './src/test-web.ts',
    },
    devtool: 'source-map',
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
        ],
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js'],
    },
    output: {
        filename: '[name].js',
        path: path.resolve(__dirname, 'dist/esm'),
    },
};