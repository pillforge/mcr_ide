define(['./Constants'], function (Constants) {
  'use strict';
  return {

    // should be called with 'this' object having core and rootNode
    // calls the callback(next) with { MainC__Scheduler: {<WebGME obj>} }
    loadComponents: function (c_wgme_paths, m_wgme_paths, next) {
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
            var store_name = [prefix, name].join(Constants.DELIMITER);
            nodes[store_name] = child;
            load_and_store_children(child, store_name, depth - 1, callback);
          }, next);
        });
      }
    }

  }
});
