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

define(['libxmljs', 'fs', 'path', 'logManager'],
  function (libxmljs, fs, path, LogManager) {
    "use strict";

    // This is based on archive.py found in the tools/tinyos/ncc/nesdoc-py
    // of a tinyos installation
    var ParseDump = function(topdir) {
      if (topdir)
        this.topdir = topdir;
      else
        this.topdir = process.env.TOSROOT;
      this.logger = LogManager.create('TinyOSPopulate.ParseDump');
    };

    ParseDump.prototype.parse = function(file_path) {

      var self = this;
      if (!file_path)
        file_path = "MainC.xml"; // For dev

      var test_file = path.resolve(file_path);
      self._wi("Test file: " + test_file);
      var xml = fs.readFileSync(test_file);
      var xml_doc = libxmljs.parseXml(xml, {noblanks: true });

      // The namespace has to be defined and
      // has to match the one in the XML file.
      var ns = {
        xmlns: "http://www.tinyos.net/nesC"
      };

      var components = xml_doc.find('//xmlns:components/xmlns:component', ns);
      var interfacedefs = xml_doc.find(
                            '//xmlns:interfacedefs/xmlns:interfacedef', ns);
      var interfaces = xml_doc.find('//xmlns:interfaces/xmlns:interface', ns);
      var functions = xml_doc.find('//xmlns:functions/xmlns:function', ns);

      self._wi("Found " + components.length + " components");
      self._wi("Found " + interfacedefs.length + " interfacedefs");
      self._wi("Found " + interfaces.length + " interfaces");
      self._wi("Found " + functions.length + " functions");

      var refidx = {};
      var qnameidx = {};
      var add_to_refid = function(x) {
        refidx[x.attr('ref').value()] = x;
      };
      var add_to_qname = function(x) {
        var comp_inst = x.get("xmlns:instance", ns);
        if (!comp_inst)
          qnameidx[x.attr('qname').value()] = x;
      };

      interfaces.forEach(add_to_refid);
      functions.forEach(add_to_refid);
      components.forEach(add_to_qname);
      interfacedefs.forEach(add_to_qname);

      var speclist = {};
      interfaces.forEach(function(x) {
        var incomponent = x.get("xmlns:component-ref", ns)
                                                    .attr('qname').value();
        if (incomponent in speclist) {
          speclist[incomponent].push(x);
        } else {
          speclist[incomponent] = [x];
        }
      });

      //self._wi(qnameidx);
      //self._wi(speclist);

      //self._wi("Qname " + Object.keys(qnameidx).length + " elements");

      var output_dict = {};

      components.forEach(function(x) {
        var comp_inst = x.get("xmlns:instance", ns);
        if (!comp_inst) {
          var comp_name = x.attr('qname').value();
          to_js(comp_name);
        }
      });

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
        if (loc.search(self.topdir) === 0) {
          loc = loc.slice(self.topdir.length + 1);
        }

        // Not sure why this is necessary
        // if (loc[0] === "/")
        //   loc = null;

        return loc;
      }

      function to_js(comp_name) {
        var specs = speclist[comp_name];
        var comp = qnameidx[comp_name];
        var comp_type = "";
        var is_abstract = false;
        var is_safe = false;
        // Get component type
        if (comp.get("xmlns:configuration", ns)) {
          comp_type = "Configuration";
        } else {
          comp_type = "Module";
        }

        if (comp.attr('abstract')) {
          is_abstract = true;
        }

        if (comp.attr('safe')) {
          is_safe = true;
        }

        var jsobj = {
          name: comp_name,
          file_path: get_path(comp),
          comp_type: comp_type,
          abstract: is_abstract,
          safe: is_safe,
          interface_types: [],
          function_declerations: [],
          parameters: []
        };
        if (specs) {
          specs.forEach(function(e) {
            var provided = parseInt(e.attr('provided').value());
            var intf_name = e.get('xmlns:instance/xmlns:interfacedef-ref', ns)
                                                      .attr('qname').value();
            var intf_as = e.attr('name').value();
            // A javascript representation of an interface_type
            var int_type = {
              name: intf_name,
              as: intf_as,
              provided: provided
            };
            jsobj.interface_types.push(int_type);
          });
        }
        output_dict[comp_name] = jsobj;
      }

      return output_dict;
    };

    ParseDump.prototype._wi = function(msg) {
      var self = this;
      self.logger.warn(msg);
      self.logger.info(msg);
    };

    return ParseDump;
  }
);
