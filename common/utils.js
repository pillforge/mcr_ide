define(['logManager'], function (logManager) {
  
  "use strict";

  var utils = function (core, META) {
    this.core = core;
    this.META = META;
    this.logger = logManager.create('utils');
  };

  utils.prototype.md = function (initial_node, component_path, next) {
    var self = this;
    self.logger.info('md()');

    var dirs = get_dirs(component_path);
    var curr_node = initial_node;
    create_directory(0);

    function create_directory (index) {
      if (index >= dirs.length) {
        next();
      } else {
        self.core.loadChildren(curr_node, function (err, children) {
          var dir_node = null;
          for (var j = children.length - 1; j >= 0; j--) {
            var name = self.core.getAttribute(children[j], 'name');
            if (name === dirs[index]) {
              dir_node = children[j];
            }
          }
          // TODO: Once we found a non-existent directory, we can create the rest
          if (dir_node == null) {
            dir_node = self.core.createNode({
              base: self.META.Folder,
              parent: curr_node
            });
            self.core.setAttribute(dir_node, 'name', dirs[index]);
          }
          curr_node = dir_node;
          create_directory(index+1);
        });
      }
    }

    function get_dirs (component_path) {
      var path = require('path');
      var ext = path.extname(component_path);
      var dirs = '';
      if (ext === '') dirs = component_path;
      if (ext === '.nc') dirs = path.dirname(component_path);
      return dirs.split('/');
    }
  };

  return utils;
});
