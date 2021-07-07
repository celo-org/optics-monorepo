const envy = require('envy');

let env = {};
try {
    env = envy();
} catch (e) {}

/*
* envy Docs: https://www.npmjs.com/package/envy
*
* envy loads variables from .env and
* creates an object with camelCase properties.
*
* if envy doesn't find a .env file, we swallow the error and
* return an empty object
* */
module.exports = env;
