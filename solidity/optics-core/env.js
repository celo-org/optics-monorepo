const envy = require('envy');

let env;
try {
    env = envy();
} catch (e) {}

module.exports = env;
