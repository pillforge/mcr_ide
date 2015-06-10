define(['module',  'plugin/PluginBase', 'plugin/PluginConfig'], function (module, PluginBase, PluginConfig) {
  "use strict";

  var NescCodeGenerator = function () {
    PluginBase.call(this);
  };

  //basic functions and setting for plugin inheritance
  NescCodeGenerator.prototype = Object.create(PluginBase.prototype);
  NescCodeGenerator.prototype.constructor = NescCodeGenerator;
  NescCodeGenerator.prototype.getName = function () {
    return "nesC Code Generator";
  };


  NescCodeGenerator.prototype.getVersion = function () {
    return '0.1.0';
  };

  NescCodeGenerator.prototype.getDefaultConfig = function() {
    return new PluginConfig();
  };

  NescCodeGenerator.prototype.main = function (callback) {
    var self = this;
    var path  = require('path');
    var doT = require('dot');
    doT.templateSettings.strip = false;
    var fs  = require('fs');

    // module.uri is the path of this file.
    self.plugin_dir = path.dirname(module.uri);
    self.output_dir = path.resolve(self.plugin_dir, "output");

      // Create self.output_dir if it doesn't already exist
    // try{
    //   fs.mkdirSync(self.output_dir);
    // }catch(e){}

    //self.updateSuccess(false, "Test failure");
    //callback(false, self.result);
    //return;

    // Check if selectedNode or active object is an App
    var app_node = self.activeNode;
    // if (!self.isMetaTypeOf(app_node, self.META.App)){
    //     self.updateSuccess(false,"An App must be selected.");
    //     callback("An App must be selected.", self.result);
    // }else{
      _process_app2();
    // }

    // Load children asynchronously and generate code
    function _process_app2() {
      // The app node is special because it's a configuration but may have more information
      var components = [app_node];
      var process = function(cur_comp){
        self.logger.info("Processing component: " + self._getNodeName(cur_comp));
        self.core.loadChildren(cur_comp, function(err, children){
          if (err) {
            console.log("Error load_nodes");
            self.result.setSuccess(false);
            callback(err, self.result);
          } else {

            var component_refs = [];
            var generic_component_refs = [];
            var interface_refs = [];
            var wirings = [];
            var async_ptr = [];
            var module_implementation = [];

            // We want to differentiate between components that are references to components that already
            // exists in the library and components created in WebGME for which we have to generate code.
            // For now, the way we do this by checking if the referenced(base) component has an empty path
            // attribute. The code would be written to the same directory as the main app.

            for (var i=0; i<children.length; i++){
              if (self._isNescComponent(children[i])){
                if (!self._isNescComponentRef(children[i])){
                  components.push(children[i]);
                }else if (self._isNescGenericComponent(children[i])){
                  generic_component_refs.push(children[i]);
                }else {
                  component_refs.push(children[i]);
                }
              } else if (self._isNescWiring(children[i])){
                async_ptr.push(children[i]);
              } else if (self._isNescInterfaceRef(children[i])){
                async_ptr.push(children[i]);
              }

            }

            var call_graph = {};
            for (i = children.length - 1; i >= 0; i--) {
              var child = children[i];
              var type = self.core.getAttribute(self.core.getBase(child), 'name');
              if (type === 'call') {
                var src_path = self.core.getPointerPath(child, 'src');
                var dst_path = self.core.getPointerPath(child, 'dst');
                var ael = self.core.getAttribute(child, 'argument-expression-list');
                call_graph[src_path] = call_graph[src_path] || new Array();
                call_graph[src_path].push([dst_path, ael]);
              }
            }


            var load_ptr = function(node_with_ptr){
              if (node_with_ptr){
                if (self._isNescWiring(node_with_ptr)){
                  self.core.loadPointer(node_with_ptr, 'src', function(err, src_node){
                    self.core.loadPointer(node_with_ptr, 'dst', function(err, dst_node){
                      console.log("Src: " + self._getNodeName(src_node.parent) + "." + self._getNodeName(src_node));
                      console.log("Dst: " + self._getNodeName(dst_node.parent) + "." + self._getNodeName(dst_node));
                      node_with_ptr.src = src_node;
                      node_with_ptr.dst = dst_node;
                      wirings.push(node_with_ptr);
                      load_ptr(async_ptr.pop());
                    });
                  });
                } else if (self._isNescInterfaceRef(node_with_ptr)){
                  self.core.loadPointer(node_with_ptr, 'interface', function(err, interface_node){
                    node_with_ptr.interface = interface_node;
                    interface_refs.push(node_with_ptr);
                    load_ptr(async_ptr.pop());
                  });
                }
              }else{
                _generate_output(cur_comp, component_refs, generic_component_refs, interface_refs, wirings, module_implementation);
                if (components.length === 0){
                  self.save('saving nesc code', function (err) {
                    self.result.setSuccess(true);
                    callback(null, self.result);
                  });
                }else {
                  console.log("Remaining components: " + components.length);
                  process(components.pop());
                }
              }
            };

            self._loadNodes(self.activeNode, function (err) {
              for (var src in call_graph) {

                var function_definition = {};
                var src_node = self._nodeCache[src];

                // set type and return type
                var base_type = self.core.getBaseType(src_node);
                if (base_type === self.META.Event) {
                  function_definition.type = 'event void';
                }

                // set name
                function_definition.name = getNameOfFunction(src_node);

                // set calls
                function_definition.calls = [];
                for (var i = call_graph[src].length - 1; i >= 0; i--) {
                  var call_dst_node = self._nodeCache[call_graph[src][i][0]];
                  var call_func_name = getNameOfFunction(call_dst_node);
                  function_definition.calls.push({
                    name: call_func_name,
                    ael: call_graph[src][i][1]
                  });
                }

                module_implementation.push(function_definition);
                debugger;
                // self.core.getAttribute(, 'name');
                // var to_name = self.core.getAttribute(self._nodeCache[])
                // console.log(src, from_name, call_graph[src]);

              }

              function getNameOfFunction(node) {
                var parent = self.core.getParent(node);
                var parent_name = self.core.getAttribute(parent, 'name');
                var src_name = self.core.getAttribute(node, 'name');
                return parent_name + '.' + src_name;
              }

              load_ptr(async_ptr.pop());      
            });

            
          }
        });
      };

      process(components.pop());
    }

    // Loads all nodes using _loadNodes and then process everything synchronously. This is more error prone when the
    // project has long pointer chains or pointer cycles (not sure about this).
    function _process_app (){
      self._loadNodes(app_node,function(err){
        if (err) {
          console.log("Error load_nodes");
          self.result.setSuccess(false);
          callback(err, self.result);
        } else {
          // The app node is special because it's a configuration but may have more information
          var components = [app_node];
          while(true){
            if (components.length === 0)
              break;

            var cur_comp = components.pop();
            console.log("Processing component: " + self._getNodeName(cur_comp));

            var component_refs = [];
            var generic_component_refs = [];
            var interface_refs = [];
            var wirings = [];
            var children = self._getChildren(cur_comp);

            // We want to differentiate between components that are references to components that already
            // exists in the library and components created in WebGME for which we have to generate code.
            // For now, the way we do this by checking if the referenced(base) component has an empty path
            // attribute. The code would be written to the same directory as the main app.

            for (var i=0; i<children.length; i++){
              if (self._isNescComponent(children[i])){
                if (!self._isNescComponentRef(children[i])){
                  components.push(children[i]);
                } else if (self._isNescGenericComponent(children[i])){
                  generic_component_refs.push(children[i]);
                } else {
                  component_refs.push(children[i]);
                }
              } else if (self._isNescWiring(children[i])){
                // create a function to create a closure for cur_child
                var cur_child = children[i];
                var src_node = self._getNode(self.core.getPointerPath(children[i], 'src'));
                var dst_node = self._getNode(self.core.getPointerPath(children[i], 'dst'));
                console.log("Src: " + self._getNodeName(src_node.parent) + "." + self._getNodeName(src_node));
                console.log("Dst: " + self._getNodeName(dst_node.parent) + "." + self._getNodeName(dst_node));
                children[i].src = src_node;
                cur_child.dst = dst_node;
                wirings.push(cur_child);
              }

            }

            _generate_output(cur_comp, component_refs, generic_component_refs, interface_refs, wirings);
          }
          self.result.setSuccess(true);
          callback(null, self.result);
        }
      });

    }

    function _generate_output (parent_component, component_refs, generic_component_refs, interface_refs, wirings, module_implementation) {
      var tmpl_context = {},
        output_file = "",
        parent_comp_name = self._getNodeName(parent_component);

      debugger;
      // If the parent component is an app, generate the Makefile
      if (self.isMetaTypeOf(parent_component, self.META.App)){
        var makefile_tmpl = fs.readFileSync(path.resolve(self.plugin_dir, "makefile.tmpl"), 'utf8');
        var makefile_template = doT.template(makefile_tmpl);
        tmpl_context = {
          component: self._createComponent(parent_component),
        };
        // Generate Makefile
        output = makefile_template(tmpl_context);
        output_file = path.resolve(self.output_dir, "Makefile");
        fs.writeFileSync(output_file, output);
      }

      // For modules and anything that has a path, we just copy the file given by the path attribute (for now)
      var nesc_path = self.core.getAttribute(parent_component, "path");
      if (nesc_path !== ""){
        output_file = path.resolve(self.output_dir, parent_comp_name + ".nc");
        var input_file_path = path.resolve(self._getTOSRoot(), nesc_path);
        fs.createReadStream(input_file_path).pipe(fs.createWriteStream(output_file));
      } else {
        // For apps and other configurations, create a context for our template

        // Read template file from plugin directory
        var config_tmpl = fs.readFileSync(path.resolve(self.plugin_dir, "config.nc.tmpl"), 'utf8');
        var config_template = doT.template(config_tmpl);

        var link_wirings_for_tmpl = [];
        var equate_wirings_for_tmpl = [];
        wirings.forEach(function(node){
          if(self.isMetaTypeOf(node,self.META.Link_Interface)){
            link_wirings_for_tmpl.push(
              {
                src: self._getNodeName(node.src.parent) + "." + self._getNodeName(node.src),
                dst: self._getNodeName(node.dst.parent) + "." + self._getNodeName(node.dst)
              }
            );
          }else if(self.isMetaTypeOf(node,self.META.Equate_Interface)){
            var src = "";
            var dst = "";
            if(node.src.parent === node.parent)
              src = self._getNodeName(node.src);
            else
              src = self._getNodeName(node.src.parent) + "." + self._getNodeName(node.src);

            if(node.dst.parent === node.parent)
              dst = self._getNodeName(node.dst);
            else
              dst = self._getNodeName(node.dst.parent) + "." + self._getNodeName(node.dst);

            equate_wirings_for_tmpl.push( { src: src, dst: dst } );

          }
        });

        var uses_interface_refs = [],
          provides_interface_refs = [];

        interface_refs.forEach(function(node){
          if (self.isMetaTypeOf(node, self.META.Uses_Interface)){
            uses_interface_refs.push(self._createInterfaceRef(node));
          } else {
            provides_interface_refs.push(self._createInterfaceRef(node));
          }
        });

        debugger;
        tmpl_context = {
          component               : self._createComponent(parent_component),
          component_refs          : component_refs.map(self._createComponent, self),
          uses_interface_refs     : uses_interface_refs,
          provides_interface_refs : provides_interface_refs,
          generic_component_refs  : generic_component_refs.map(self._createComponent, self),
          link_wirings            : link_wirings_for_tmpl,
          equate_wirings          : equate_wirings_for_tmpl,
          module_implementation   : module_implementation
        };
        // Generate App file
        var output = config_template(tmpl_context);
        // console.log(output);
        output_file = path.resolve(self.output_dir, parent_comp_name + ".nc");
        // fs.writeFileSync(output_file, output);
        self.core.setAttribute(self.activeNode, "source", output);
        self.createMessage(self.activeNode, {src: output});
      }

    }
  };

  NescCodeGenerator.prototype._createComponent = function(node) {
    var self = this;
    var base = self._getNodeName(self.core.getBase(node));
    var name_as  = self._getNodeName(node);
    var out = {'base': base};
    if (base !== name_as)
      out.name= name_as;

    var type = 'configuration';
    var bt = self.core.getBaseType(node);
    if (bt === self.META.Module)
      type = 'module';
    out.type = type;

    return out;
  };

  NescCodeGenerator.prototype._createInterfaceRef = function(node) {
    var self = this;
    var out = {
      base : self._getNodeName(node.interface),
      instance_parameters : self.core.getAttribute(node, 'instance_parameters'),
      type_arguments : self.core.getAttribute(node, 'type_arguments')
    };
    var name_as = self._getNodeName(node);
    if (out.base !== name_as)
      out.name = name_as;

    return out;
  };

  NescCodeGenerator.prototype._getBaseAttribute = function (node, name) {
    return this.core.getAttribute(this.core.getBase(node), name);
  };


  // Tamas' implementation
  NescCodeGenerator.prototype._loadNodes = function (start_node, callback) {
    var self = this;
    self._nodeCache = {};

    var load = function(node, fn, depth) {
      self.core.loadChildren(node, function(err, children) {
        if (err) {
          fn(err);
        } else {
          var recCalls = children.length;
          var error = null;

          if(recCalls === 0){
            fn(null);
          }

          for (var i = 0; i < children.length; i++) {
            self._nodeCache[self.core.getPath(children[i])] = children[i];
            load(children[i], load_err_handler, depth++);
          }

        }

        function load_err_handler(err) {
          error = error || err;
          if(--recCalls === 0) { //callback only on last child
            fn(error);
          }
        }

      });
    };

    load(start_node, callback, 0);
  };

  NescCodeGenerator.prototype._getNodeName = function (node) {
    return this.core.getAttribute(node, 'name');
  };

  NescCodeGenerator.prototype._getNode = function (nodePath){
    //we check only our node cache
    return this._nodeCache[nodePath];
  };

  NescCodeGenerator.prototype._cacheNode = function (node) {
    this._nodeCache[this.core.getPath(node)] = node;
  };

  /**
   * Fetch the child nodes of a given node from the cache
   */
  NescCodeGenerator.prototype._getChildren = function (node) {
    var self = this;
    var children_paths = self.core.getChildrenPaths(node);
    var children = [];
    children_paths.forEach(function(child_path) {
    var child = self._getNode(child_path);
    if (child)
      children.push(child);
    });
    return children;
  };

  /**
   * Searches through the children of a given node and finds the first node
   * that has
   * the specified name. If a node is not found, null is returned.
   * If the children argument is given, it will be used instead of fetching
   * it using _getChildren. This is useful when
   * repeated calls to _findNodeByName need to be made.
   */
  NescCodeGenerator.prototype._findNodeByName = function (node, name,
    children) {
    var self = this;
    if (!children)
    children = this._getChildren(node);
    var result = null;
    for (var i = 0; i < children.length; i++) {
    var child = children[i];
    if (this._getNodeName(child) === name) {
      result = children[i];
      break;
    }
    }
    return result;
  };

  NescCodeGenerator.prototype._getTOSRoot = function() {
    return process.env.TOSROOT;
  };

  NescCodeGenerator.prototype._isNescModule = function (node) {
    return this.isMetaTypeOf(node, this.META.Module) ||  this.isMetaTypeOf(node, this.META.Generic_Module);
  };

  NescCodeGenerator.prototype._isNescConfiguration = function (node) {
    return this.isMetaTypeOf(node, this.META.Configuration) ||  this.isMetaTypeOf(node, this.META.Generic_Configuration);
  };

  NescCodeGenerator.prototype._isNescWiring = function (node) {
    return this.isMetaTypeOf(node, this.META.Wire_Interface) ||  this.isMetaTypeOf(node, this.META.Wire_Function);
  };

  NescCodeGenerator.prototype._isNescComponent = function (node) {
    return this.isMetaTypeOf(node, this.META.Component);
  };

  NescCodeGenerator.prototype._isNescComponentRef = function (node) {
    return this._isNescComponent(node) && !this.baseIsMeta(node);
  };

  NescCodeGenerator.prototype._isNescGenericComponent = function (node) {
    return this.isMetaTypeOf(node, this.META.Generic_Module) ||  this.isMetaTypeOf(node, this.META.Generic_Configuration);
  };

  NescCodeGenerator.prototype._isNescInterfaceRef = function (node) {
    return this.isMetaTypeOf(node, this.META.Interface_Type);
  };

  return NescCodeGenerator;
});
