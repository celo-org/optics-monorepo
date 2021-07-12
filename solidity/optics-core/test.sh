set -e

npm run compile
cd ../../typescript/optics-tests
npm run test
cd ../..