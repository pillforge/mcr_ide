define(['../common/NesC_XML_Generator'], function (NesC_XML_Generator) {
  'use strict';

  var TinyOSPopulaterWorker = function (core, META, rootNode, logger) {
    this.core = core;
    this.META = META;
    this.rootNode = rootNode;
    this.logger = logger;
    this.logger.info('TinyOSPopulaterWorker constructor');
  };

  TinyOSPopulaterWorker.prototype.main = function(next) {
    var self = this;
    var nxg = new NesC_XML_Generator();
    nxg.getComponentsPaths(function (error, components_paths) {
      if (error !== null) {
        next(error);
      } else {
        self.logger.error(error);
        self.logger.info(components_paths);
        self.logger.info(typeof components_paths);
        next();
      }
    });
  };

  return TinyOSPopulaterWorker;

});
