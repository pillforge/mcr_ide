define([], function () {
  
  "use strict";

  var utils = function (core, META, logger) {
    this.core = core;
    this.META = META;
    this.logger = logger;
  };

  utils.prototype.remove_files = function (files) {
    this.logger.info('remove_files()');
    var fs = require('fs');
    for (var i = files.length - 1; i >= 0; i--) {
      if (fs.existsSync(files[i]))
        fs.unlinkSync(files[i]);
    }
  };

  utils.prototype.save_children_as_files = function (node, next) {
    var self = this;
    self.logger.info('save_children_as_files()');
    var fs = require('fs');
    var created = [];
    self.core.loadChildren(node, function (err, children) {
      if (err) {
        self.logger.error(err);
        next(created);
      } else {
        for (var i = children.length - 1; i >= 0; i--) {
          var src = self.core.getAttribute(children[i], 'source');
          var name = self.core.getAttribute(children[i], 'name');
          var base_obj = self.core.getBase(children[i]);
          var base_name = self.core.getAttribute(base_obj, 'name');
          var extension = '.nc';
          if (base_name === 'Header_File') extension = '.h';
          fs.writeFileSync(name + extension, src);
          created.push(name + extension);
        }
        next(created);
      }
    });
  };

  utils.prototype.save_linked_components = function (component_node, next) {
    var self = this;
    self.logger.info('save_linked_components()');
    var fs = require('fs');

    var parent = self.core.getParent(component_node);
    var linked_projects = self.core.getAttribute(parent, 'linked_projects').split(' ');
    linked_projects.push('../' + self.core.getAttribute(parent, 'name'));

    var created = [];
    var counter = 0;
    if (linked_projects.length === 0) next(created);
    self.for_each_then_call_next(linked_projects, function (linked_project, fn_next) {
      var dirs = linked_project.split('/');
      var curr_node = parent;
      self.for_each_then_call_next(dirs, function (dir, fnn_next) {
        if (dir === '..') {
          curr_node = self.core.getParent(curr_node);
          fnn_next();
        } else {
          self.core.loadChildren(curr_node, function (err, children) {
            var found = false;
            for (var i = children.length - 1; i >= 0; i--) {
              var name = self.core.getAttribute(children[i], 'name');
              if (name === dir) {
                found = true;
                curr_node = children[i];
                break;
              }
            }
            if (found) {
              fnn_next();
            } else {
              self.logger.error('save_linked_components()');
              fnn_next();
            }
          });
        }
      }, function () {
        self.save_children_as_files(curr_node, function (created_files) {
          created = created.concat(created_files);
          fn_next();
        });
      });
    }, function () {
      next(created);
    });
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
        setTimeout(next, 0);
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
        // next(curr_node);
        setTimeout(next, 0, curr_node);
      } else {
        self.core.loadChildren(curr_node, function (err, children) {
          if (err) {
            self.logger.error(err);
            // next(false);
            setTimeout(next, 0, false);
          } else {
            var dir_node = null;
            for (var j = children.length - 1; j >= 0; j--) {
              var name = self.core.getAttribute(children[j], 'name');
              if (name === dirs[index]) {
                dir_node = children[j];
              }
            }
            if (dir_node == null) {
              // return next(false);
              return setTimeout(next, 0, false);
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

  // Use at Util, remove later.
  utils.prototype.get_path_without_ext = function (component_path) {
    var path = require('path');
    return path.join(
      path.dirname(component_path),
      path.basename(component_path, path.extname(component_path))
      );
  };

  utils.prototype.get_dirs_with_file = function (component_path) {
    var path = require('path');
    return this.get_path_without_ext(component_path).split('/');
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
