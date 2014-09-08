define([], function () {

  var Refresher = function (core, META, app_json) {
    this.core = core;
    this.META = META;
    this.app_json = app_json;
  };

  Refresher.prototype.update = function (node, component, callback) {
    var self = this;
    self.updateComponent(node, component);
    self.updateUPInterfaces(node, component, callback);
    // self._createWirings(self._app_json.components[key]);
  };

  Refresher.prototype.updateComponent = function (node, component) {
    var self = this;
    var val = self.app_json.components[component].safe;
    self.core.setAttribute(node, 'safe', val);
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
