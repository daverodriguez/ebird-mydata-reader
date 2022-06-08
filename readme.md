# ebird-mydata-reader
A utility library to load "My Data" ZIP files from eBird as JSON and query the data in various ways.

## What's this project all about?
I wanted to build an [interactive map](https://birdmap-explorer.ohiodave.com/) using my eBird observation data, but eBird has no APIs that let you authenticate and access your own data that way. Inspired by [BirdStat](https://birdstat.com/), I decided to build my app based on the "Download my data" export provided by eBird, and to write a library to work with the export data file.

## About the eBird export format
 eBird exports data was a ZIP archive containing a single CSV file. Inside that CSV are all the observations by species you've ever reported to eBird. The following data fields are included:
 
| Field name | Data type | Example Value | Notes |
| ---------- | --------- | ------------- | ----- |
| submissionID | string | S64432125 | |
| commonName | string | Black-bellied Whistling-Duck | |
| scientificName | string | Dendrocygna autumnalis | |
| taxonomicOrder | number | 221 | Corresponds to the taxonomic order in the [2021 eBird Taxonomy](https://www.birds.cornell.edu/clementschecklist/download/) |
| count | number OR string | 25 | The number of birds reported with this observation. Can also be "X". |
| stateProvince | string | US-TX | |
| county | string | Hidalgo | |
| locationId | string | L2526526 | The eBird location ID of the hotspot where the bird was reported. Note that private hotspots might not have an eBird detail page you can go to. |
| location | string | Mission- Bannworth Park | |
| latitude | number | 26.2182048 | |
| longitude | number | -98.2834674 | |
| date | string | 2020-02-13 | |
| time | string | 05:33 PM | |
| protocol | string | eBird - Stationary Count | [Guide to eBird Protocols](https://support.ebird.org/en/support/solutions/articles/48000950859-guide-to-ebird-protocols) |
| durationMin | number | 26 | The duration of the checklist, in minutes | 
| allObsReported | number | 0 | (Inferring) whether this bird was reported by all observers, in a shared checklist. |
| distanceTraveledKm | number | 1.547 | May be null or undefined for certain protocols (e.g. Stationary or Incidental) |
| areaCoveredHa | number | null | May be null or undefined for certain protocols |
| numberOfObservers | number | 1 | |
| breedingCode | string | null | [eBird Breeding and Behavior Codes](https://support.ebird.org/en/support/solutions/articles/48000837520-ebird-breeding-and-behavior-codes) |
| observationDetails | string | Seen and heard | Null, unless the user added comments for this observation |
| checklistComments | string | Red Trail | Any comments the user added to the entire checklist. |
| mlCatalogNumbers | string | [209018071](https://macaulaylibrary.org/asset/209018071) [218880651](https://macaulaylibrary.org/asset/218880651) | The Macaulay Library ID numbers of any photos associated with this observation. |
 
 The import process also enriches the data with some extra calculated fields:

| Field name | Data type | Example Value | Notes |
| ---------- | --------- | ------------- | ----- |
| observedYear | number | 2020 | |
| observedMonth | number | 2 | Month-numbers are 1-based (so January is 1) | 
| baseScientificName | string | Dendrocygna autumnalis | If the sighting is of a subspecies, `baseScientificName` strips off the subspecies portion of the scientific name to allow all subspecies observations to be grouped. |
| isLifer | boolean | true | `true`, if this is the first recorded observation of this species in the data file |
| isFirstOfYear | boolean | true | `true`, if this is the first observation of this species in a given year |

## Loading and parsing eBird data

`ebird-mydata-reader` supports web and Node.js contexts. 

### Node.js
For Node use, load the eBird ZIP file using `readFile` or `readFileSync`, then call
the `loadDataFile()` method of `ebird-mydata-reader`. This will return the eBird data as a
string containing the entire file contents in CSV format.

Next, pass the CSV data to the `parseData()` method. This will convert the CSV data to JSON
and enrich the data with extra properties as described above.

`loadDataFile()` returns a Promise, so if you want
to use it with `await` (the recommended method), the containing function
should be marked as `async`.

```typescript
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
```

### Web use

`ebird-mydata-reader` can be used with build tools like Webpack that support CommonJS modules, directly as ES6, or as a global export.
It also contains TypeScript types. Depending on your build system, you may want to use the `cjs` (CommonJS), `esm` (ES Modules), or `global` distribution.

For web use, you'll want an `<input type="file" />` element. You can
load the file locally using the input's `files` API
and a `FileReader`. The output of `FileReader.readAsArrayBuffer` returns
an `ArrayBuffer`, which can be passed to the `loadDataFile()` method.

The output of `loadDataFile()` can then be passed to `parseData()` as
discussed above in the Node.js example.

```typescript
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
``` 

## Other available methods

Once you've got the data loaded, several methods are available to 
help you query the eBird observations. These include **getFilteredObservations**,
**getMonthsWithObservations**, **getObservationsBySpecies**, and **getObservationsByLocation**.

## Full Function Reference

## Functions

<dl>
<dt><a href="#loadDataFile">loadDataFile(dataFile)</a> ⇒</dt>
<dd><p>Loads an eBird &quot;My Data&quot; ZIP file and extracts the CSV data, returning it as a string</p>
</dd>
<dt><a href="#parseData">parseData(csvData)</a> ⇒</dt>
<dd><p>Parses a string containing eBird observations in CSV format and returns an array of enriched data objects</p>
</dd>
<dt><a href="#annotateData">annotateData(rawData)</a></dt>
<dd><p>Accepts an array of eBird observation objects and calculates additional information including the observed year and month,
the base scientific name (without subspecies), and whether the bird is the first observation ever for a user (a &quot;lifer&quot;),
or the first observation in a calendar year</p>
</dd>
<dt><a href="#getFilteredObservations">getFilteredObservations(annotatedData, filterYear, filterMonth, getAllObservations)</a> ⇒</dt>
<dd></dd>
<dt><a href="#getMonthsWithObservations">getMonthsWithObservations(annotatedData, filterYear)</a> ⇒</dt>
<dd></dd>
<dt><a href="#getObservationsBySpecies">getObservationsBySpecies(annotatedData)</a> ⇒</dt>
<dd></dd>
<dt><a href="#getObservationsByLocation">getObservationsByLocation(annotatedData)</a></dt>
<dd></dd>
</dl>

<a name="loadDataFile"></a>

## loadDataFile(dataFile) ⇒
Loads an eBird "My Data" ZIP file and extracts the CSV data, returning it as a string

**Kind**: global function  
**Returns**: Promise<string>

| Param | Type |
| --- | --- |
| dataFile | <code>string</code> `\|` <code>ArrayBuffer</code> `\|` <code>Buffer</code> | 

<a name="parseData"></a>

## parseData(csvData) ⇒
Parses a string containing eBird observations in CSV format and returns an array of enriched data objects

**Kind**: global function  
**Returns**: EBirdMyDataSchema[]

| Param | Type |
| --- | --- |
| csvData | <code>string</code> | 

<a name="annotateData"></a>

## annotateData(rawData)
Accepts an array of eBird observation objects and calculates additional information including the observed year and month,
the base scientific name (without subspecies), and whether the bird is the first observation ever for a user (a "lifer"),
or the first observation in a calendar year

**Kind**: global function

| Param | Type |
| --- | --- |
| rawData | <code>Array.&lt;EBirdMyDataSchema&gt;</code> | 

<a name="getFilteredObservations"></a>

## getFilteredObservations(annotatedData, filterYear, filterMonth, getAllObservations) ⇒
**Kind**: global function  
**Returns**: EBirdMyDataSchema[]

| Param |
| --- |
| annotatedData | 
| filterYear | 
| filterMonth | 
| getAllObservations | 

<a name="getMonthsWithObservations"></a>

## getMonthsWithObservations(annotatedData, filterYear) ⇒
**Kind**: global function  
**Returns**: number[]

| Param |
| --- |
| annotatedData | 
| filterYear | 

<a name="getObservationsBySpecies"></a>

## getObservationsBySpecies(annotatedData) ⇒
**Kind**: global function  
**Returns**: EBirdObservationsBySpecies[]

| Param | Type |
| --- | --- |
| annotatedData | <code>Array.&lt;EBirdMyDataSchema&gt;</code> | 

<a name="getObservationsByLocation"></a>

## getObservationsByLocation(annotatedData)
**Kind**: global function

| Param | Type |
| --- | --- |
| annotatedData | <code>Array.&lt;EBirdMyDataSchema&gt;</code> | 

