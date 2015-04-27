/*jshint node: true*/
/**
 * @author lattmann / https://github.com/lattmann
 */

var config = require('webgme/config/config.default');

config.server.port = 9091;

// config.plugin.basePaths.push('./src/plugins/Test');
//config.plugin.basePaths = ['./src/plugins/Test']; //disable exposure of core-plugins

config.mongo.uri = 'mongodb://127.0.0.1:27017/multi';
config.plugin.basePaths.push('./plugins');
config.plugin.basePaths.push('./test/meta')
// config.visualization.decoratorPaths.unshift("./decorators");

config.seedProjects.enable = true;
config.seedProjects.defaultProject = 'Meta';
config.seedProjects.basePaths = ['./seeds'];

module.exports = config;
