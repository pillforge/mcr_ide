var gme_config = require('../config');
var webgme = require('webgme');

webgme.addToRequireJsPaths(gme_config);

exports.requirejs = webgme.requirejs;
