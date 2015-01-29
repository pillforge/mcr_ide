define(['../common/Util'], function (Util) {
  "use strict";

  var AppImporterWorker = function (core, META) {
    this.core = core;
    this.META = META;
    this.util = new Util(this.core, this.META);
  };

  AppImporterWorker.prototype.createApp = function (next) {
    var self = this;
    next();
  };

  return AppImporterWorker;

});
