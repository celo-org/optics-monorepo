set -e

npm run compile
cd ../../typescript/optics-tests
npm i
npm run test
cd ../..