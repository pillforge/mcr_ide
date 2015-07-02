define(['plugin/PluginBase', 'plugin/PluginConfig', '../utils/Constants'],
function (PluginBase, PluginConfig, Constants) {

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
    var async = require('async');

    // { MainC: '/497022377/1117940255/1637150336' }
    var config_wgme_paths = core.getRegistry(self.rootNode, 'configuration_paths');
    var module_wgme_paths = core.getRegistry(self.rootNode, 'module_paths');

    async.series([
      function (callback) {
        self.loadComponents(config_wgme_paths, module_wgme_paths, function (nodes) {
          self._nodes = nodes;
          callback();
        });
      },
      function (callback) {
        self.createConfigurationWirings(config_wgme_paths, callback);
      },
      function (callback) {
        self.createModuleCalls(module_wgme_paths, callback);
      }
    ], function (err, results) {
      self.result.setSuccess(true);
      callback(null, self.result);
    });

  };

  // calls the callback with { MainC__Scheduler: {<WebGME obj>} }
  TinyOSWiringPopulater.prototype.loadComponents = function (c_wgme_paths, m_wgme_paths, next) {
    var self = this;
    var core = self.core;
    var async = require('async');
    var nodes = {};

    async.series([
      function (callback) {
        async.forEachOf(c_wgme_paths, function (value, key, callback) {
          load_and_store(value, key, 1, callback);
        }, callback);
      },
      function (callback) {
        async.forEachOf(m_wgme_paths, function (value, key, callback) {
          load_and_store(value, key, 2, callback);
        }, callback);
      }
    ], function (err, results) {
      next(nodes);
    });

    function load_and_store (value, key, depth, callback) {
      core.loadByPath(self.rootNode, value, function (err, node) {
        nodes[key] = node;
        load_and_store_children(node, key, depth, callback);
      });
    }

    function load_and_store_children (node, prefix, depth, next) {
      if (depth < 1) return next();
      core.loadChildren(node, function (err, children) {
        async.each(children, function (child, callback) {
          var name = core.getAttribute(child, 'name');
          var store_name = self.joinPath(prefix, name);
          nodes[store_name] = child;
          load_and_store_children(child, store_name, depth - 1, callback);
        }, next);
      });
    }

  };

  TinyOSWiringPopulater.prototype.createConfigurationWirings = function (config_wgme_paths, next) {
    var self = this;
    var core = self.core;
    var async = require('async');
    var instances = {};

    async.forEachOf(config_wgme_paths, function (value, key, callback) {
      var node = self._nodes[key];
      var config_dump = core.getRegistry(node, 'nesc-dump');
      wire_configuration(key, node, config_dump.wiring, callback);
    }, function (err) {
      next();
    });
    
    function wire_configuration (config_name, node, wirings, next) {
      async.eachSeries(wirings, function (wire, callback) {
        async.parallel([
          function (callback) {
            get_interface(config_name, node, wire.from, function (node) {
              callback(null, node);
            });
          },
          function (callback) {
            get_interface(config_name, node, wire.to, function (node) {
              callback(null, node);
            });
          }
        ], function (err, results) {
          var fi_node = results[0];
          var ti_node = results[1];
          if (fi_node && ti_node)
            self.logger.info(config_name, core.getAttribute(fi_node, 'name'), core.getAttribute(ti_node, 'name') );
          callback();
        });
      }, function (err) {
        next();
      });

    }

    function get_interface (config_name, node, end, next) {
      
      if (config_name === end.name)
        return next(self._nodes[self.joinPath(end.name, end.interface)]);
      
      if (end.name in instances)
        return next(instances[self.joinPath(end.name, end.interface)]);

      var instance_node = core.createNode({
        base: self._nodes[end.name],
        parent: node
      });
      instances[end.name] = instance_node;

      core.loadChildren(instance_node, function (err, children) {
        for (var i = children.length - 1; i >= 0; i--) {
          var child_name = core.getAttribute(children[i], 'name');
          instances[self.joinPath(end.name, child_name)] = children[i];
        }
        return next(instances[self.joinPath(end.name, end.interface)]);
      });

    }

  };

  TinyOSWiringPopulater.prototype.joinPath = function (a, b) {
    return [a, b].join(Constants.DELIMITER);
  };

  TinyOSWiringPopulater.prototype.createModuleCalls = function (module_wgme_paths, next) {
    next();
  };

  return TinyOSWiringPopulater;

});
