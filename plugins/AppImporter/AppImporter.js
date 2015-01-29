define(
  ['plugin/PluginBase',
  'plugin/PluginConfig',
  './Refresher'
  ],
  function (PluginBase, PluginConfig, Refresher) {
    "use strict";

    var AppImporter = function () {
      PluginBase.call(this);
    };
    AppImporter.prototype = Object.create(PluginBase.prototype);
    AppImporter.prototype.constructor = AppImporter;
    AppImporter.prototype.getName = function () {
      return "AppImporter";
    };
    AppImporter.prototype.getVersion = function () {
      return '0.0.0';
    };

    AppImporter.prototype.main = function (callback) {
      var self = this;
      var r = new Refresher(self.core, self.META);
      r.createApp(function () {
        self.save('saving', function () {
          self.result.setSuccess(true);
          callback(null, self.result);
        });
      });
    };

    return AppImporter;
});
