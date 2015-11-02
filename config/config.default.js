'use strict';

var config = require('./config.webgme');
var validateConfig = require('webgme/config/validator');

config.server.port = 9091;
config.mongo.uri = 'mongodb://127.0.0.1:27017/multi';

config.plugin.basePaths.push('./plugins');
config.plugin.allowServerExecution = true;

config.visualization.decoratorPaths.unshift("./decorators");

config.seedProjects.enable = true;
config.seedProjects.defaultProject = 'Meta';
config.seedProjects.basePaths.push('./seeds');

validateConfig(config);
module.exports = config;
