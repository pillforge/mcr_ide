define(['plugin/PluginBase', 'plugin/PluginConfig', '../utils/Constants', '../utils/PathUtils',
       '../ModelGenerator/Refresher', '../utils/WebgmeUtils'],
function (PluginBase, PluginConfig, Constants, path_utils, Refresher, wgme_utils) {

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
    var save = true;

    // { MainC: '/497022377/1117940255/1637150336' }
    var c_wgme_paths = core.getRegistry(self.rootNode, 'configuration_paths');
    var m_wgme_paths = core.getRegistry(self.rootNode, 'module_paths');

    var paths_arr = [
      { paths: c_wgme_paths, depth: 1 },
      { paths: m_wgme_paths, depth: 2 }
    ];

    // We are starting over for each configuration and module due to a WebGME bug
    async.forEachOfSeries(c_wgme_paths, function (value, key, callback) {
      async.series([
        function (callback) {
          wgme_utils.loadObjects.call(self, paths_arr, function (err, nodes) {
            self._nodes = nodes;
            callback();
          });
        },
        function (callback) {
          var obj = {};
          obj[key] = value;
          self.createConfigurationWirings(obj, callback);
        }
      ], function (err, results) {
        callback();
      });

    }, function (err) {
      self.createTasks(m_wgme_paths);
      wgme_utils.loadObjects.call(self, paths_arr, function (err, nodes) {
        self._nodes = nodes;
        self.createModuleCalls(m_wgme_paths);
        if (save) {
          self.save('save', function (err) {
            call_callback(true);
          });
        } else call_callback(true);
      });
    });

    function call_callback (success) {
      self.result.setSuccess(success);
      callback(null, self.result);
    }

  };

  TinyOSWiringPopulater.prototype.createConfigurationWirings = function (c_wgme_paths, next) {
    var self = this;
    var core = self.core;
    var async = require('async');
    var instances = {};

    async.forEachOf(c_wgme_paths, function (value, key, callback) {
      var node = self._nodes[key];
      var config_dump = core.getRegistry(node, 'nesc-dump');
      wire_configuration(key, node, config_dump.wiring);
      callback();
    }, function (err) {
      next();
    });
    
    function wire_configuration (config_name, node, wirings) {
      for (var i = wirings.length - 1; i >= 0; i--) {
        var wire = wirings[i];
        var fi = get_interface(config_name, node, wire.from);
        var ti = get_interface(config_name, node, wire.to);
        if (fi[0] && ti[0]) {
          var wiring_node = self.core.createNode({
            base: getBase(fi[1], ti[1]),
            parent: node
          });
          self.core.setPointer(wiring_node, 'src', fi[0]);
          self.core.setPointer(wiring_node, 'dst', ti[0]);
          if (wire.from.cst)
            self.core.setAttribute(wiring_node, 'src_params', 'cst:' + wire.from.cst);
          if (wire.to.cst)
            self.core.setAttribute(wiring_node, 'dst_params', 'cst:' + wire.to.cst);
        } else {
          self.logger.warn('interface couldn\'t be found');
          if (!fi[0]) self.logger.warn('no fi');
          if (!ti[0]) self.logger.warn('no ti');
          self.logger.warn('', wire);
        }
      }

      function getBase (a, b) {
        if (a === 'equate' || b === 'equate')
          return self.META.Equate_Interface;
        return self.META.Link_Interface;
      }

    }

    function get_interface (config_name, node, end) {

      if (config_name === end.name)
        return [self._nodes[self.joinPath(end.name, end.interface)], 'equate'];
      
      if ( !(end.name in instances) ) {

        var instance_node = core.createNode({
          base: self._nodes[path_utils.getFileName(end.component_base)],
          parent: node
        });
        instances[end.name] = instance_node;

        var c_ids = core.getChildrenRelids(instance_node);
        for (var i = c_ids.length - 1; i >= 0; i--) {
          var child = core.getChild(instance_node, c_ids[i]);
          var child_name = core.getAttribute(child, 'name');
          instances[self.joinPath(end.name, child_name)] = child;
        }
      }

      return [instances[self.joinPath(end.name, end.interface)], 'link'];
    }

  };

  TinyOSWiringPopulater.prototype.joinPath = function () {
    return Array.prototype.join.call(arguments, Constants.DELIMITER);
  };

  TinyOSWiringPopulater.prototype.createModuleCalls = function (m_wgme_paths) {
    var self = this;
    for (var m_name in m_wgme_paths) {
      var node = self._nodes[m_name];
      var all_calls = self.core.getRegistry(node, 'calls');
      Refresher.prototype.createCallConnectionsModule.call(self, node, all_calls, get_node);
    }
    function get_node (interf, port) {
      var path = self.joinPath(m_name, interf);
      if (port)
        path = self.joinPath(path, port);
      return self._nodes[path];
    }
  };

  TinyOSWiringPopulater.prototype.createTasks = function(m_wgme_paths) {
    var self = this;
    for (var m_name in m_wgme_paths) {
      var node = self._nodes[m_name];
      var tasks = self.core.getRegistry(node, 'tasks');
      for (var i = tasks.length - 1; i >= 0; i--) {
        var task_node = self.core.createNode({
          base: self.META.Task,
          parent: node
        });
        self.core.setAttribute(task_node, 'name', tasks[i]);
      }
    }
  };

  return TinyOSWiringPopulater;

});
