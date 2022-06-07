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
