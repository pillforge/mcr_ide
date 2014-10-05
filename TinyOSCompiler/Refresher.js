define([], function () {

  var Refresher = function (core, META, app_json) {
    this.core = core;
    this.META = META;
    this.app_json = app_json;
  };

  Refresher.prototype.update = function (node, component, callback) {
    var self = this;
    self.deleteChildren(node, function () {
      self.updateComponent(node, component, function () {
        self.updateUPInterfaces(node, component, function () {
          self.updateWirings(node, component, function () {
            callback();
          });
        });
      });
    });
  };

  Refresher.prototype.updateWirings = function (node, component, next) {
    var self = this;
    var wires = self.app_json.components[component].wiring;
    var counter = 0;
    var created = {};
    wires.forEach(function (w) {
      self.findObject(node, component, w.from.component_base, function (fc) {
        console.log('farewell', w.from.component_base, (fc ? fc.data.atr.path : fc));
        if (fc == null) {
          counter++;
          if (counter == wires.length) {
            next();
          }
        } else {
          self.findObject(node, component, w.to.component_base, function (tc) {
            console.log('hello', w.to.component_base, (tc ? tc.data.atr.path : tc));
            if (tc == null) {
              counter++;
              if (counter == wires.length) {
                next();
              }
            } else {

              var from_port_component = create_wiring_component(fc, w.from);
              var to_port_component = create_wiring_component(tc, w.to);

              // create wiring
              if (from_port_component && to_port_component) {
                getPort(from_port_component, w.from.interface, function (from_port) {
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
                self.core.loadChildren(object, function (err, children) {
                  if (err) return;
                  for (var i = children.length - 1; i >= 0; i--) {
                    var n = self.core.getAttribute(children[i], 'name');
                    if (n == name) {
                      cb(children[i]);
                      return;
                    }
                  }
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
    if (self.app_json.components[component].file_path == path) {
      callback(node);
      return;
    }

    var root = self.core.getRoot(node);
    var paths = getPaths(path);
    if (paths == null) {
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
    var val = self.app_json.components[component].safe;
    self.core.setAttribute(node, 'safe', val);
    next();
  };

  Refresher.prototype.updateUPInterfaces = function (node, component, cb) {
    var self = this;
    var interfaces = self.app_json.components[component].interface_types;
    var counter = 0;
    var messages = [];
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
