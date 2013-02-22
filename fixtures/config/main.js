var Config = require('../..');

module.exports = new Config(__dirname)
    .add('file1', {prefix: true})
    .add('file2', {prefix: true})
    .add('file1.envs', {envs: 'prop'})
    .add('file2.envs', {envs: 'prop'})
    ;

