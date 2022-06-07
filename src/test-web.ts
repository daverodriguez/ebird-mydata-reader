import {loadDataFile, parseData} from "./ebird-mydata-reader";

document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.querySelector('#ebirdData');
    fileInput.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement;
        console.log(target.files);
        if (target.files.length) {
            const dataFile = target.files[0];
            const fr = new FileReader();
            fr.onload = (contents) => {
                onFileChange(contents.target.result);
            };
            fr.readAsArrayBuffer(dataFile);
        }
    });
});

const onFileChange = async (fileContents) => {
    const loadingEl = document.getElementById('loading');
    loadingEl.classList.add('in-progress');

    const csvData = await loadDataFile(fileContents);
    const jsonData = parseData(csvData);

    loadingEl.classList.remove('in-progress');

    const outputEl = document.getElementById('output') as HTMLInputElement;
    outputEl.value = JSON.stringify(jsonData, null, '\t');
}