define(['logManager'], function (logManager) {
  
  "use strict";

  var utils = function (core, META) {
    this.core = core;
    this.META = META;
    this.logger = logManager.create('utils');
  };

  utils.prototype.get_type_of_interface = function (interface_desc) {
    if (interface_desc.provided === 1)
      return this.META.Provides_Interface;
    return this.META.Uses_Interface;
  };

  utils.prototype.get_base_of_component = function (component) {
    var self = this;
    if (component.comp_type == 'Module') {
      return component.generic ?
        self.META.Generic_Module : self.META.Module;
    }
    return component.generic ?
      self.META.Generic_Configuration : self.META.Configuration;
  };

  utils.prototype.for_each_then_call_next = function (object, apply, next) {
    var self = this;
    self.logger.info('for_each_then_call_next()');
    var counter = 0, objects_keys = Object.keys(object);
    call_apply(0);

    function call_apply (index) {
      if (index >= objects_keys.length) {
        next();
      } else {
        apply(object[objects_keys[index]], function () {
          call_apply(index+1);
        });
      }
    }

  };

  utils.prototype.exists = function (initial_node, component_path, next) {
    var self = this;
    self.logger.info('exists()');
    var dirs = self.get_dirs_with_file(component_path);
    var curr_node = initial_node;
    check_component(0);

    function check_component (index) {
      if (index >= dirs.length) {
        next(curr_node);
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

  utils.prototype.get_dirs_with_file = function (component_path) {
    var path = require('path');
    return path.join(
      path.dirname(component_path),
      path.basename(component_path, path.extname(component_path))
      ).split('/');
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
