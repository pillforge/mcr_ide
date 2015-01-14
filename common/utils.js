define(['logManager'], function (logManager) {
  
  "use strict";

  var utils = function (core, META) {
    this.core = core;
    this.META = META;
    this.logger = logManager.create('utils');
  };

  utils.prototype.for_each_then_call_next = function (object, apply, next) {
    var self = this;
    self.logger.info('for_each_then_call_next()');
    var counter = 0, objects_length = Object.keys(object).length;
    for (var key in object) {
      apply(object[key], function () {
        counter++;
        if (counter >= objects_length) {
          next();
        }
      });
    }
  };

  utils.prototype.exists = function (initial_node, component_path, next) {
    var self = this;
    self.logger.info('exists()');

    var dirs = self.get_dirs(component_path);
    var curr_node = initial_node;
    check_component(0);

    function check_component (index) {
      if (index >= dirs.length) {
        next(true);
      } else {
        self.core.loadChildren(curr_node, function (err, children) {
          if (err) {
            self.logger.error(err);
            next(false);
          } else {
            var dir_node = null;
            for (var j = children.length - 1; j >= 0; j--) {
              var name = self.core.getAttribute(children[j], 'name');
              if (name === dirs[index]) {
                dir_node = children[j];
              }
            }
            if (dir_node == null) {
              return next(false);
            }
            curr_node = dir_node;
            check_component(index+1);
          }
        });
      }
    }

  };

  utils.prototype.md = function (initial_node, component_path, next) {
    var self = this;
    self.logger.info('md()');

    var dirs = self.get_dirs(component_path);
    var curr_node = initial_node;
    create_directory(0);

    function create_directory (index) {
      if (index >= dirs.length) {
        next(curr_node);
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

  };

  utils.prototype.get_dirs = function (component_path) {
    var path = require('path');
    var ext = path.extname(component_path);
    var dirs = '';
    if (ext === '') dirs = component_path;
    if (ext === '.nc') dirs = path.dirname(component_path);
    return dirs.split('/');
  };

  return utils;
});
