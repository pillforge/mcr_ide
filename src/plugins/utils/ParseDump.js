/*
 * Copyright (C) 2014 Vanderbilt University, All rights reserved.
 *
 * Author: Addisu Z. Taddese
 */

// If given a single file, this module generates a JSON file that easily
// be converted into a WebGME object. If given a set of files,
// the module analyzes each file while making sure a component
// is not processed twice. That is, if 'a' is already processed as a result of
// being referenced in another component, the file that contains
// the component does not need to be processed again.
//
// TODO: 
// - Parse generic component paremeter lists
// - Include function declerations in a component's spec
// - Add components and their wiring withing a component
// - Process interface defs

define([], function () {
  'use strict';

  // This is based on archive.py found in the tools/tinyos/ncc/nesdoc-py // of a tinyos installation

  return {
    parse: function (xml) {
      var libxmljs = require('libxmljs');
      var fs = require('fs');
      var path = require('path');
      var _ = require('lodash');
      var xml_doc = libxmljs.parseXml(xml, { noblanks: true });

      // The namespace has to be defined and has to match the one in the XML file.
      var ns = {
        xmlns: "http://www.tinyos.net/nesC"
      };

      var components = xml_doc.find('//xmlns:components/xmlns:component', ns);
      var interfacedefs = xml_doc.find('//xmlns:interfacedefs/xmlns:interfacedef', ns);
      var interfaces = xml_doc.find('//xmlns:interfaces/xmlns:interface', ns);
      var functions = xml_doc.find('//xmlns:functions/xmlns:function', ns);

      var refidx = {};
      var qnameidx = {};
      var add_to_refid = function (x) {
        refidx[x.attr('ref').value()] = x;
      };
      var add_to_qname = function (x) {
        qnameidx[x.attr('qname').value()] = x;
      };

      interfaces.forEach(add_to_refid);
      functions.forEach(add_to_refid);
      components.forEach(add_to_qname);
      interfacedefs.forEach(add_to_qname);

      var speclist = {};
      interfaces.forEach(function(x) {
        var incomponent = x.get("xmlns:component-ref", ns).attr('qname').value();
        speclist[incomponent] = speclist[incomponent] || [];
        speclist[incomponent].push(x);
      });

      var instance_components = {};
      components.forEach(function(x) {
        var comp_inst = x.get("xmlns:instance", ns);
        if (comp_inst) {
          var comp_name = x.attr('qname').value();
          instance_components[comp_name] = {
            name: comp_name,
            base: get_path(qnameidx[comp_name])
          };
        }
      });

      var output_dict = {};
      components.forEach(function(x) {
        var comp_inst = x.get("xmlns:instance", ns);
        if (!comp_inst) {
          var comp_name = x.attr('qname').value();
          to_js(comp_name);
        }
      });

      var interfacedefs_json = {};
      for (var key in interfacedefs) {
        var interfacedef = interfacedefs[key];
        var qname = interfacedef.attr('qname').value();
        interfacedefs_json[qname] = {
          name: qname,
          file_path: get_path(interfacedef),
          functions: []
        };
        functions = interfacedef.find('xmlns:function', ns);
        var funct_arr = interfacedefs_json[qname].functions;
        for (var i = 0; i < functions.length; i++) {
          var funct = functions[i];
          funct_arr.push({
            name: funct.attr('name').value(),
            event_command: getEventCommand(funct),
            parameters: []
          });
          var params = funct.find('xmlns:parameters', ns);
          if (params) {
            var vars = params[0].find('xmlns:variable', ns);
            for (var j = 0; j < vars.length; j++) {
              var par = vars[j];
              var type_name = ''; //par.find('xmlns:type-var', ns)[0].attr('name').value();
              var var_name = '';
              if (par.attr('name')) {
                var_name = par.attr('name').value();
              }
              funct_arr[i].parameters.push(type_name + ' ' + var_name);
            }
          }
        }
      }

      var app_json = {};
      app_json.components = output_dict;
      app_json.interfacedefs = interfacedefs_json;
      app_json.instance_components = instance_components;

      function to_js(comp_name) {
        var specs = speclist[comp_name];
        var comp = qnameidx[comp_name];

        var comp_type = 'Module';
        var is_abstract = false;
        var is_safe = false;

        if (comp.get("xmlns:configuration", ns)) comp_type = 'Configuration';
        if (comp.attr('abstract')) is_abstract = true;
        if (comp.attr('safe')) is_safe = true;

        var wiring = [];
        var wiring_nodes = comp.find('xmlns:wiring/xmlns:wire', ns);
        for (var i = wiring_nodes.length - 1; i >= 0; i--) {
          var w_node = wiring_nodes[i];

          var from = w_node.get('xmlns:from', ns);
          var to = w_node.get('xmlns:to', ns);

          var w_obj = {
            from: get_c_obj(from),
            to: get_c_obj(to)
          };
          wiring.push(w_obj);
        }

        // <parameters>
        var parameters = [];
        var parameters_node = comp.get('xmlns:parameters', ns);
        if (parameters_node) {
          var parameters_children = parameters_node.childNodes();
          parameters_children.forEach(child => {
            var type_int_node = child.get('xmlns:type-int', ns);
            if (type_int_node) {
              var param_value = type_int_node.attr('cname').value();
              parameters.push(param_value);
            }
          });
        }

        var jsobj = {
          name: comp_name,
          file_path: get_path(comp),
          comp_type: comp_type,
          generic: is_abstract,
          safe: is_safe,
          interface_types: [],
          tasks: [],
          function_declarations: [],
          parameters: parameters,
          wiring: wiring
        };

        if (specs) {
          specs.forEach(function(e) {
            var provided = parseInt(e.attr('provided').value());
            var intf_name = e.get('xmlns:instance/xmlns:interfacedef-ref', ns)
                                                      .attr('qname').value();
            var intf_as = e.attr('name').value();
            // Check if it is a task definition: TaskBasic
            if (intf_name === 'TaskBasic') {
              var interface_ref = e.get('xmlns:type-interface/xmlns:interface-ref', ns);
              var interface_ref_name = interface_ref.attr('name').value();
              if (interface_ref_name !== 'TaskBasic') {
                return jsobj.tasks.push(intf_as);
              }
            }

            var argument_type_list = '';
            var arguments_node = e.get('xmlns:instance/xmlns:arguments', ns);
            if (arguments_node) {
              var arg_arr = [];
              var arguments_children = arguments_node.childNodes();
              for (var i = arguments_children.length - 1; i >= 0; i--) {
                if (arguments_children[i].type() == 'text') continue;
                var argument_type = arguments_children[i].name();
                var tr_xpath = './xmlns:typedef-ref | */xmlns:typedef-ref' +
                  ' | */*/xmlns:typedef-ref';
                var arg_typedef_ref = arguments_children[i].get(tr_xpath, ns);
                if (arg_typedef_ref) {
                  var arg_type_name = arg_typedef_ref.attr('name').value();
                  if (argument_type == 'type-pointer') {
                    arg_type_name = 'const ' + arg_type_name + '*';
                  }
                  arg_arr.unshift(arg_type_name);
                }
              }
              argument_type_list = arg_arr.join(', ');
            }

            // <interface-parameters>
            var interface_parameters_value = [];
            var interface_parameters = e.get('xmlns:interface-parameters', ns);
            if (interface_parameters) {
              var interface_parameters_children = interface_parameters.childNodes();
              interface_parameters_children.forEach(child => {
                var typedef_ref = child.get('*/xmlns:typedef-ref', ns);
                if (typedef_ref) {
                  interface_parameters_value.push(typedef_ref.attr('name').value()); 
                }
              });
            }
            
            // A javascript representation of an interface_type
            var int_type = {
              name: intf_name,
              as: intf_as,
              provided: provided,
              arguments: argument_type_list,
              interface_parameters: interface_parameters_value.join(' ')
            };
            jsobj.interface_types.push(int_type);
          });
        }

        functions.forEach(function (func) {
          var incomponent = func.get('xmlns:component-ref', ns);
          if (incomponent) {
            var name = func.attr('name').value();
            if (comp_name === incomponent.attr('qname').value()) {
              jsobj.function_declarations.push(name);
            }
          }
        });

        jsobj.interface_types = _.uniqBy(jsobj.interface_types, 'as');
        jsobj.function_declarations = _.uniq(jsobj.function_declarations);
        jsobj.tasks = _.uniq(jsobj.tasks);
        output_dict[comp_name] = jsobj;

        function get_c_obj(c) {
          var ref = c.get('xmlns:interface-ref', ns).attr('ref').value();
          var interf = refidx[ref];
          var component_base = get_path(interf);
          var name = refidx[ref].get('xmlns:component-ref', ns)
            .attr('qname').value();

          var c_arguments_node = c.get('xmlns:arguments/xmlns:value', ns);
          var c_arg_value = null;
          if (c_arguments_node) {
            c_arg_value = c_arguments_node.attr('cst').value();
          }

          return {
            component_base: component_base,
            'interface': interf.attr('name').value(),
            cst: c_arg_value,
            ref: ref,
            name: name
          };
        }
      }

      function getEventCommand (element) {
        return element.attr('event') === null ?
          (element.attr('command') === null ? '' : 'command') :
          'event';
      }

      /*
       * Modified version of packagename in archive.py
       * This version doesn't replace '/' with '.' and doesn't remove
       * the file extension.
       * The path returned will be used for locating the file in a local
       * filesystem as well as in * WebGME
       */
      function get_path(comp) {
        var loc = comp.attr('loc').value();
        var col = loc.indexOf(':');
        if (col !== -1) {
          loc = loc.slice(col + 1);
        }
        if (loc.search(process.env.TOSROOT) === 0) {
          loc = loc.slice(process.env.TOSROOT.length + 1);
        }

        // Not sure why this is necessary
        // if (loc[0] === "/")
        //   loc = null;

        return loc;
      }

      return app_json;
    }
  };

});