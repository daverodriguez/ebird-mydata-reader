# ebird-mydata-reader
A utility library to load "My Data" ZIP files from eBird as JSON and query the data in various ways.

## What's this project all about?
I wanted to build an [interactive map](https://birdmap-explorer.ohiodave.com/) using my eBird observation data, but eBird has no APIs that let you authenticate and access your own data that way. Inspired by [BirdStat](https://birdstat.com/), I decided to build my app based on the "Download my data" export provided by eBird, and to write a library to work with the export data file.

## About the eBird export format
 eBird exports data was a ZIP archive containing a single CSV file. Inside that CSV are all the observations by species you've ever reported to eBird. The following data fields are included:
 
 ```
 submissionID: string,
 commonName: string,
 scientificName: string,
 taxonomicOrder: number,
 count: number,
 stateProvince: string,
 county: string,
 locationId: string,
 location: string,
 latitude: number,
 longitude: number,
 date: string,
 time: string,
 protocol: string,
 durationMin: number,
 allObsReported: number,
 distanceTraveledKm: number,
 areaCoveredHa: number,
 numberOfObservers: number,
 breedingCode: string,
 observationDetails: string,
 checklistComments: string,
 mlCatalogNumbers: string
 ```
 
 The import process also enriches the data with some extra calculated fields:
 ```
 observedYear: number,
 observedMonth: number,
 baseScientificName: string,
 isLifer: boolean,
 isFirstOfYear: boolean
 ```
