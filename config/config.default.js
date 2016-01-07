var config = require('./config.webgme');
var validateConfig = require('webgme/config/validator');

config.server.port = 9091;
config.mongo.uri = 'mongodb://127.0.0.1:27017/multi';

config.plugin.basePaths.push('./plugins');
config.plugin.allowServerExecution = true;
config.plugin.allowBrowserExecution = false;

config.visualization.decoratorPaths.unshift("./decorators");

config.seedProjects.enable = true;
config.seedProjects.defaultProject = 'Meta';

config.requirejsPaths.project_src = 'src';
config.requirejsPaths.project_root = '.';

validateConfig(config);
module.exports = config;
