# BirdMap Explorer Image Pipeline

## Project Goal

BirdMap Explorer uses the official eBird taxonomy to represent every
recognized bird species.

The current implementation retrieves the first image from Wikipedia, but
this results in inconsistent quality. The objective is to build a
reusable image acquisition and curation pipeline that automatically
finds, scores, crops, and caches one high-quality representative image
for every species while preserving licensing and attribution metadata.

The pipeline should be rerunnable whenever the eBird taxonomy is
updated.

------------------------------------------------------------------------

## Input

Use the official eBird taxonomy CSV.

For every species obtain:

-   Common Name
-   Scientific Name
-   Species Code

Ignore hybrids, domestic forms, slash taxa, and other non-species
entries during the initial implementation.

------------------------------------------------------------------------

## Overall Pipeline

Species

↓

Collect candidate images

↓

Download metadata

↓

AI quality scoring

↓

Reject unsuitable images

↓

Crop around subject

↓

Generate thumbnails

↓

Store approved image

------------------------------------------------------------------------

## Candidate Sources

Design the system around pluggable providers.

Initial providers:

1.  Wikimedia Commons
2.  Wikipedia
3.  iNaturalist (if practical)

Future providers should be easy to add:

-   Macaulay Library
-   Observation.org
-   Licensed commercial sources

Implement a provider interface so new sources can be added without
changing the rest of the pipeline.

------------------------------------------------------------------------

## Candidate Collection

Attempt to retrieve 5--10 candidate images per species.

Store:

-   source
-   source URL
-   photographer
-   license
-   attribution
-   original resolution
-   local cached original

------------------------------------------------------------------------

## AI Evaluation

Each candidate should be evaluated by a vision model.

Reject:

-   range maps
-   illustrations
-   paintings
-   museum skins
-   taxidermy
-   skeletons
-   nests only
-   eggs only
-   blurry images
-   heavily watermarked images

Score positively for:

-   living bird
-   correct species
-   sharp focus
-   unobstructed subject
-   large subject
-   pleasing composition
-   natural lighting
-   perched or side-profile pose
-   clean background

Store both the score and reasoning.

------------------------------------------------------------------------

## Cropping

Locate the bird automatically.

Generate square crops:

-   512×512
-   256×256
-   128×128

Crop metadata should remain editable without modifying the original
image.

------------------------------------------------------------------------

## Storage Layout

/source_candidates/ speciesCode/ original images metadata

/approved/ speciesCode/ 512.jpg 256.jpg 128.jpg meta.json

catalog.json

review_state.json

------------------------------------------------------------------------

## Review Tool

Create a local web application (review.html).

For every species display the top candidate images.

For each candidate provide:

-   Use this image
-   Adjust crop
-   Reject
-   View attribution

Approving an image should:

-   update review_state.json
-   regenerate thumbnails
-   regenerate catalog.json

Never edit generated files manually.

All edits should be represented as review decisions and crop metadata.

------------------------------------------------------------------------

## Review Status

Support:

-   auto_approved
-   manual_approved
-   needs_review
-   rejected
-   missing
-   license_blocked

------------------------------------------------------------------------

## Catalog Output

Produce a JSON catalog for application consumption.

Each entry should include:

-   common name
-   scientific name
-   species code
-   approved images (allow multiple)
-   source
-   photographer
-   license
-   attribution
-   source URL

------------------------------------------------------------------------

## Caching

Never redownload an image unless requested.

Support:

-   refresh one species
-   refresh one family
-   refresh entire catalog

------------------------------------------------------------------------

## Stretch Goals

-   detect captive birds
-   detect juveniles
-   detect breeding plumage
-   detect flying vs perched
-   detect multiple birds
-   generate dominant UI colors
-   retain top 3--5 approved candidates for future use

------------------------------------------------------------------------

## Final Deliverables

-   reusable pipeline
-   pluggable provider architecture
-   local image cache
-   automatic AI scoring
-   review tool
-   generated thumbnails
-   JSON catalog
-   documentation describing the regeneration process
