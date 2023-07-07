# puppeteer_scraping

## build

First need to install node.js. 
After that, to initialize the package.json, use this command.
npm install.

## execution

To execution, use this command.
node index.js

## Purpose

This exercise is designed to test the ability to use JavaScript, object-oriented design principles, data structures, and standard algorithms to create a web crawler. Processed scraping "walgreens" with puppeteer.
 

## Workflow

The workflow is like this:

 1. The crawler navigates a “starting url” on the website. 
 2. The crawler gets all the categories from a "starting url". 
 3. The crawler navitates "Household Essentials" and gets all sub-catetories of "Household Essentials". 
 4. The crawler loops all sub-catetories of "Household Essentials" and gets the production information.
 5. For each sub-cateroy, save the result in one json file. 