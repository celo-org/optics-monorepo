const { types } = require('hardhat/config');

task('deploy-home')
  .addParam('slip44', 'The origin chain SLIP44 ID', undefined, types.int)
  .addParam('updater', 'The origin chain updater', undefined, types.string)
  .addParam('currentRoot', 'The current root')
  .setAction(async (args) => {});
