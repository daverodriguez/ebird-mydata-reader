import * as fs from 'fs';
import {loadDataFile, parseData} from "./ebird-mydata-reader";

const test = async () => {
    const dataFilePath = 'test-data/ebird_1651490197786.zip';
    const dataFile = fs.readFileSync(dataFilePath);

    const csvData = await loadDataFile(dataFile);
    const jsonData = parseData(csvData);

    fs.writeFileSync('test-data/test.json', JSON.stringify(jsonData, null, '\t'));
}

test();