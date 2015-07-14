define([ 'plugin/PluginConfig'
       , 'plugin/PluginBase'
       , './../nodes.json'
       ],
function (PluginConfig, PluginBase, meta_json) {
  'use strict';

  var MetaInspector = function () {
    PluginBase.call(this);
  };

  MetaInspector.prototype = Object.create(PluginBase.prototype);
  MetaInspector.prototype.constructor = MetaInspector;

  MetaInspector.prototype.getName = function () {
    return 'MetaInspector';
  };

  MetaInspector.prototype.getVersion = function () {
    return '0.0.1';
  };

  MetaInspector.prototype.main = function (callback) {
    for (var key in meta_json) {
      if (this.META[key] === undefined) {
        this.result.setSuccess(false);
        var err_msg = 'META is missing: ';
        err_msg += key;
        return callback(err_msg, this.result);
      }
    }
    this.result.setSuccess(true);
    callback(null, this.result);
  };

  return MetaInspector;

});
