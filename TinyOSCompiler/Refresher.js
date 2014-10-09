define(['logManager'], function (logManager) {

  var Refresher = function (core, META, app_json) {
    this.core = core;
    this.META = META;
    this.app_json = app_json;
    this.logger = logManager.create('Refresher');
  };

  Refresher.prototype.update = function (node, component, callback) {
    var self = this;
    self.logger.info('update');
    self.deleteChildren(node, function () {
      self.updateComponent(node, component, function () {
        self.updateUPInterfaces(node, component, function () {
          self.updateWirings(node, component, function () {
            self.logger.info('update finished, calling callback');
            callback();
          });
        });
      });
    });
  };

  Refresher.prototype.updateWirings = function (node, component, next) {
    var self = this;
    self.logger.info('updateWirings');
    var wires = self.app_json.components[component].wiring;
    var counter = 0;
    var created = {};
    // if (wires.length > 0 ) wires = [wires[0]];
    if (wires.length < 1) next();
    wires.forEach(function (w) {
      self.findObject(node, component, w.from.component_base, function (fc) {
        self.logger.info('wiring from: ' + w.from.component_base + ' ' + (fc ? 'found' : fc));
        if (!fc) {
          counter++;
          if (counter == wires.length) {
            next();
          }
        } else {
          self.findObject(node, component, w.to.component_base, function (tc) {
            self.logger.info('wiring to: ' + w.to.component_base + ' ' + (tc ? 'found' : tc));
            if (!tc) {
              counter++;
              if (counter == wires.length) {
                next();
              }
            } else {
              self.logger.info('Both objects are found');
              var from_port_component = create_wiring_component(fc, w.from);
              var to_port_component = create_wiring_component(tc, w.to);

              // create wiring
              if (from_port_component && to_port_component) {
                getPort(from_port_component, w.from.interface, function (from_port) {
                  if (!from_port) {
                    counter++;
                    if (counter == wires.length) {
                      next();
                    }
                  }
                  self.logger.info('from port is found');
                  getPort(to_port_component, w.to.interface, function (to_port) {

                    var base_type = self.META.Link_Interface;
                    if (from_port_component == node || to_port_component == node)
                      base_type = self.META.Equate_Interface;

                    var wiring_node = self.core.createNode({
                      base: base_type,
                      parent: node,
                    });
                    self.core.setPointer(wiring_node, 'src', from_port);
                    self.core.setPointer(wiring_node, 'dst', to_port);

                    counter++;
                    if (counter == wires.length) {
                      next();
                    }
                  });
                });
              } else {
                counter++;
                if (counter == wires.length) {
                  next();
                }
              }

              function getPort (object, name, cb) {
                self.logger.info('getPort for');
                self.core.loadChildren(object, function (err, children) {
                  if (err) {
                    self.logger.error(err);
                    return;
                  }
                  self.logger.info('getPort children loaded');
                  for (var i = children.length - 1; i >= 0; i--) {
                    var n = self.core.getAttribute(children[i], 'name');
                    console.log(name, n);
                    if (n == name) {
                      cb(children[i]);
                      return;
                    }
                  }
                  cb(null);
                });
              }


              function create_wiring_component (mc, port_information) {
                if (mc == node) return node;// self._cache[port_information.interface];
                if (created[port_information.component_base]) {
                  return created[port_information.component_base];
                }
                var new_port_obj = self.core.createNode({
                  base: mc,
                  parent: node
                });
                created[port_information.component_base] = new_port_obj;
                return new_port_obj;
              }

              function getWiringInterface(c, c_interface) {
                var c_ids = self.core.getChildrenRelids(c);
                var interface_node = null;
                for (var i = c_ids.length - 1; i >= 0; i--) {
                  var interf_child = self.core.getChild(c, c_ids[i]);
                  var interface_name = self.core.getAttribute(interf_child, 'name');
                  if (interface_name == c_interface) return interf_child;
                }
                return null;
              }

            }
          });
        }

      });
    });
  };

  Refresher.prototype.findObject = function (node, component, path, callback) {
    var self = this;
    self.logger.info('findObject' + ' -> ' + component + ' ' + path);
    if (self.app_json.components[component].file_path == path) {
      callback(node);
      return;
    }

    // First we check if the object is in the same folder with the node
    var parent = self.core.getParent(node);
    self.core.loadChildren(parent, function (err, children) {
      if (err) {
        self.logger.error('findObject > loadChildren for the node\'s siblings');
      } else {
        for (var i = children.length - 1; i >= 0; i--) {
          var nn = self.core.getAttribute(children[i], 'name');
          if (nn + '.nc' == path) {
            callback(children[i]);
            return;
          }
        }
      }
      // Then we try to find the object in its full path
      self.logger.info('findObject > looking for the full path')
      var root = self.core.getRoot(node);
      var paths = getPaths(path);
      if (!paths) {
        self.logger.error('findObject > can\'t resolve the path')
        callback(null);
        return;
      }
      var curr = root;
      findChild(0);

      function findChild(index) {
        if (index >= paths.length) {
          callback(curr);
        } else {
          self.core.loadChildren(curr, function (err, children) {
            if (err) {
              self.logger.error('in findObject > findChild > loadChildren');
              callback(null);
              return;
            }
            var getTheNextChild = false;
            for (var j = children.length - 1; j >= 0; j--) {
              var nn = self.core.getAttribute(children[j], 'name');
              if (nn == paths[index]) {
                curr = children[j];
                getTheNextChild = true;
                break;
              }
            }
            if (!getTheNextChild) {
              self.logger.info('findObject > findChild > no next child');
              callback(null);
              return;
            }
            findChild(index+1);
          });
        }
      }

    });




    function getPaths(path) {
      var paths;
      try {
        paths = path.split('.')[0].split('/');
      } catch (error) {
        return null;
      }
      return paths;
    }
  };

  Refresher.prototype.deleteChildren = function (node, next) {
    var self = this;
    self.logger.info('deleteChildren');
    self.core.loadChildren(node, function (err, children) {
      if (err) {
        throw new Error(err);
      } else {
        for (var i = children.length - 1; i >= 0; i--) {
          self.core.deleteNode(children[i]);
        };
        next();
      }
    });
  };

  Refresher.prototype.updateComponent = function (node, component, next) {
    var self = this;
    self.logger.info('updateComponent');
    var val = self.app_json.components[component].safe;
    self.core.setAttribute(node, 'safe', val);
    next();
  };

  Refresher.prototype.updateUPInterfaces = function (node, component, cb) {
    var self = this;
    self.logger.info('updateUPInterfaces');
    var interfaces = self.app_json.components[component].interface_types;
    var counter = 0;
    var messages = [];
    if (interfaces.length < 1) cb();
    for (var i = interfaces.length - 1; i >= 0; i--) {
      findObject(interfaces[i], function (error, obj, interf) {
        if (error) {
          var m = 'Cannot find the interface object';
          messages.push({m: error});
        } else {
          var base = self.META.Uses_Interface;
          if (interf.provided === 1)
            base = self.META.Provides_Interface;
          var int_node = self.core.createNode({
            base: base,
            parent: node
          });
          self.core.setAttribute(int_node, 'name', interf.as);
          self.core.setPointer(int_node, 'interface', obj);
          if (interf.argument_type) {
            self.core.setAttribute(int_node, 'type_arguments', interf.argument_type);
          }
        }
        counter++;
        if (counter==interfaces.length) {
          cb();
        }
      });
    }
    function findObject(interf, callback) {
      try {
        var name = interf.name;
        var interdef = self.app_json.interfacedefs[name];
        var fp = interdef.file_path;
        var root = self.core.getRoot(node);
        var paths = fp.split('.')[0].split('/');
        var curr = root;
        findChild(0);
        function findChild(index) {
          if (index >= paths.length) {
            callback(null, curr, interf);
          } else {
            self.core.loadChildren(curr, function (err, children) {
              if (err) {
                callback(err, null, interf);
                return;
              }
              for (var j = children.length - 1; j >= 0; j--) {
                var nn = self.core.getAttribute(children[j], 'name');
                if (nn == paths[index]) {
                  curr = children[j];
                  break;
                }
              }
              findChild(index+1);
            });
          }
        }
      } catch(error) {
        callback(error, null, interf);
      }

    }
  };

  return Refresher;
  
});
