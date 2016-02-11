var config = require('./config.webgme');
var validateConfig = require('webgme/config/validator');

config.server.port = 9091;
config.mongo.uri = 'mongodb://127.0.0.1:27017/multi';

config.plugin.allowServerExecution = true;
config.plugin.allowBrowserExecution = false;

config.visualization.decoratorPaths.unshift("./decorators");
config.seedProjects.basePaths = config.seedProjects.basePaths
  .filter(path => path.indexOf('webgme') === -1);

config.seedProjects.enable = true;
config.seedProjects.defaultProject = 'Meta';

config.requirejsPaths.project_src = 'src';
config.requirejsPaths.project_root = '.';

config.storage.patchRootCommunicationEnabled = false;

validateConfig(config);
module.exports = config;
