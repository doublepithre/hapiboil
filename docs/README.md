# API documentation guidelines
Use hyphens for routes.\
For query params, request body and response use camelCase.

For routes use nouns rather than verbs see:
https://cloud.google.com/blog/products/api-management/restful-api-design-nouns-are-good-verbs-are-bad

For using camelCase in your sql queries:\
https://stackoverflow.com/questions/32649218/how-do-i-select-a-column-using-an-alias \
https://www.w3schools.com/sql/sql_ref_as.asp

## For development 
See openapi specifications for writing the docs. https://swagger.io/specification/

See the vscode extension for openapi:
https://marketplace.visualstudio.com/items?itemName=42Crunch.vscode-openapi

## How to build the documentaion
If not already installed
```
npm install snippet-enricher-cli
```
Ensure you are in the docs directory.
```
../node_modules/.bin/snippet-enricher-cli --targets="node_request" --input=apidocs.yaml > apidocs.json # this generates code snippets for bundling later
npx redoc-cli bundle apidocs.json
```
This will generate `redoc-static.html`
