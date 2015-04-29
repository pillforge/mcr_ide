var config = require('./config.default');

// config.server.log.transports[0].options.level = 'debug';

config.server.log.patterns = ['gme:plugin:*'];

config.server.log.transports.push({
  transportType: 'Console',
  options: {
    name: 'plugin-console',
    level: 'debug',
    colorize: true,
    timestamp: true,
    prettyPrint: true
  }
});

module.exports = config;
