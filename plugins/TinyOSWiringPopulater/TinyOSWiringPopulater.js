define(['plugin/PluginBase', 'plugin/PluginConfig'],
function (PluginBase, PluginConfig) {

  'use strict';

  var TinyOSWiringPopulater = function () {
    PluginBase.call(this);
  };

  TinyOSWiringPopulater.prototype = Object.create(PluginBase.prototype);
  TinyOSWiringPopulater.prototype.constructor = TinyOSWiringPopulater;

  TinyOSWiringPopulater.prototype.getName = function () {
    return 'TinyOSWiringPopulater';
  };

  TinyOSWiringPopulater.prototype.getVersion = function () {
    return '0.0.1';
  };

  TinyOSWiringPopulater.prototype.main = function (callback) {
    var self = this;
    var core = self.core;
    var comp_wgme_paths = core.getRegistry(self.rootNode, 'component_paths');
    
    if (!comp_wgme_paths) {
      self.result.setSuccess(false);
      self.logger.warn('No component_paths registry is defined for ROOT.'
                       + ' Plugin quit and didn\'t change anything');
      callback(null, self.result);
    }

    self.createAllWirings(comp_wgme_paths, function () {
      self.result.setSuccess(true);
      callback(null, self.result);
    });

    // self.save('saving', function (err) {
    //   self.result.setSuccess(true);
    //   callback(null, self.result);
    // });
  };

  TinyOSWiringPopulater.prototype.createAllWirings = function (comp_wgme_paths, next) {
    var self = this;
    var core = self.core;
    debugger;

    core.loadByPath(self.rootNode, comp_wgme_paths['MainC'], function (err, node) {
      console.log(core.getAttribute(node, 'name'));
      core.loadChildren(node, function (err, children) {
        for (var i = children.length - 1; i >= 0; i--) {
          var child = children[i];
          var name = core.getAttribute(child, 'name');
          console.log(name);
        }
        next();
      });
    });

    // for (var c_path in comp_wgme_paths) {

    // }
    // next();
  };

  TinyOSWiringPopulater.prototype._end = function (is_save) {

  };

  return TinyOSWiringPopulater;

});
