# About this data

Harbour Ferries does not exist. The operator, its routes, vessels and every number were invented for a demonstration, and a small script generated the season so that the tables agree with each other.

## How the tables fit together

- Daily ridership has one row per day. The five route columns add up to Riders. Cancelled is Sailings scheduled minus Sailings run, and On time % is On time divided by Sailings run.
- Routes holds each route's season total, which is the sum of that route's column in Daily ridership. Share % is its part of all riders.
- Fleet names the route each vessel normally works. The Route values match the names in Routes.
- Fare mix splits the season's riders by ticket type and adds up to the same total.
- Season history ends with 2026, taken from the daily table; the three earlier seasons are invented round figures for comparison.

## How the season was made

Each route has a base level that rises to a peak in late July and falls away in September. Weekends lift the leisure routes more than the commuter one, weather moves the open-water routes most, and a few named days (see the Note column) get an extra lift. Fog and wind cancel sailings and delay the rest.

## Importing

This folder is laid out for form.md's importer: a Markdown file is a page, a CSV file is a database, a folder named like a file belongs to it, and the pages inside the Routes folder become the pages of the matching rows. Import the zip; the format can stay on Detect automatically.
