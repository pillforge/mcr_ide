define(['./Constants', './NescUtils', './MetaMap'], function (Constants, nesc_utils, m_map) {
  'use strict';
  return {

    // should be called with 'this' object having META
    getMetaNode: function (name) {
      return this.META[m_map[name]];
    },

    // should be called with 'this' object having core, META, and rootNode
    // caches the created object in nodes and add its path in fwp
    // returns the existing or created WebGME object
    mkdirp: function (file_path, nodes, fwp) {
      var self = this;
      var path = require('path');
      var dirs = path.dirname(file_path).split(path.sep);
      var parent_node = self.rootNode;
      var curr_path = '';
      for (var i = 0; i < dirs.length; i++) {
        curr_path += (curr_path === '' ? '' : Constants.DELIMITER) + dirs[i];
        if (!nodes[curr_path]) {
          var dir_node = self.core.createNode({
            base: self.META[m_map.Folder],
            parent: parent_node
          });
          self.core.setAttribute(dir_node, 'name', dirs[i]);
          self.logger.info('created folder', dirs[i]);
          nodes[curr_path] = dir_node;
          fwp[curr_path] = self.core.getPath(dir_node);
        }
        parent_node = nodes[curr_path];
      }
      return parent_node;
    },

    // should be called with 'this' object having core and rootNode
    // calls the callback(next) with err and { MainC__Scheduler: {<WebGME obj>} }
    // paths_arr = [ {paths: c_wgme_paths, depth: 1 }, { paths: m_wgme_paths, depth: 2 } ];
    loadObjects: function (paths_arr, next) {
      var self = this;
      var core = self.core;
      var async = require('async');
      var nodes = {};

      async.each(paths_arr, function (obj, callback) {
        async.forEachOf(obj.paths, function (value, key, callback) {
          load_and_store(value, key, obj.depth, callback);
        }, callback);
      }, function (err) {
        next(null, nodes);
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
            var store_name = [prefix, name].join(Constants.DELIMITER);
            nodes[store_name] = child;
            load_and_store_children(child, store_name, depth - 1, callback);
          }, next);
        });
      }
    }

  }
});
