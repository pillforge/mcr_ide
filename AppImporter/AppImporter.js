define(
  ['plugin/PluginBase',
  'plugin/PluginConfig',
  'logManager',
  '../package.json',
  '../config.json',
  '../TinyOSPopulate/NesC_XML_Generator',
  '../TinyOSPopulate/ParseDump',
  '../common/utils'
  ],
  function (PluginBase, PluginConfig, LogManager, pjson, config_json, NesC_XML_Generator, ParseDump, utils) {
    "use strict";

    var AppImporter = function () {
      PluginBase.call(this);
      this.logger = LogManager.create('AppImporter');
      this.platform = config_json.platform || 'exp430';
    };

    AppImporter.prototype = Object.create(PluginBase.prototype);
    AppImporter.prototype.constructor = AppImporter;
    AppImporter.prototype.getName = function () {
      return "AppImporter";
    };
    AppImporter.prototype.getVersion = function () {
      return pjson.version;
    };
    AppImporter.prototype.getDefaultConfig = function () {
      return new PluginConfig();
    };

    AppImporter.prototype.main = function (callback) {
      var self = this;
      self.logger.info('main()');
      this.utils = new utils(this.core, this.META);

      var file_path = '/home/hakan/Documents/tinyos-apps/Icra2015Expt/Base/Icra2015ExptBaseAppC.nc';
      self.createApp(file_path, function (error) {
        if (error !== null) {
          self.result.setSuccess(false);
          self.createMessage(null, err_msg);
          callback(error, self.result);
        } else {
          self.save('Save AppImporter changes', function () {
            self.result.setSuccess(true);
            callback(null, self.result);
          });
        }
      });

    };

    AppImporter.prototype.createApp = function (file_path, next) {
      var self = this;
      self.logger.info('createApp()');
      var nxg = new NesC_XML_Generator(self.platform);
      var fs = require('fs');
      var path = require('path');
      var dir_path = path.dirname(file_path);
      var opts = '-I ' + dir_path;
      opts += ' -I /home/hakan/Documents/tinyos-apps/Icra2015Expt/include/';
      var app_name = 'Icra2015ExptBaseAppC';
      var file = fs.readFileSync(file_path, 'utf8');
      nxg.getXML(path.resolve(file_path), opts, function (error, xml) {
        if (error !== null) {
          var err_msg = 'err in getXML';
          self.logger.error(err_msg + ': ' + error);
          next(error);
        } else {
          var pd = new ParseDump();
          var app_json = pd.parse(null, xml);
          self.createInterfaces(app_json.interfacedefs, function () {
            self.createComponents(app_json.components, function () {
              next(null);
            });
          });
        }
      });
    };

    AppImporter.prototype.createComponents = function (components, next) {
      var self = this;
      self.logger.info('createComponents()');
      self.utils.for_each_then_call_next(components, function (component, fn_next) {
        self.createComponent(component, fn_next);
      }, next);
    };

    AppImporter.prototype.createComponent = function (component, next) {
      var self = this;
      self.logger.info('createComponent(): ' + component.name);
      self.utils.exists(self.rootNode, component.file_path, function (exists) {
        if (!exists) {
          self.logger.info('creating the component: ' + component.name);
          self.utils.md(self.rootNode, component.file_path, function (end_node) {
            var component_node = self.core.createNode({
              base: self.utils.get_base_of_component(component),
              parent: end_node
            });
            self.core.setAttribute(component_node, 'name', component.name);
            self.core.setAttribute(component_node, 'safe', component.safe);
            self.core.setAttribute(component_node, 'path', component.file_path);
            next();
          });
        } else {
          self.logger.info('skipping the component: ' + component.name)
          next();
        }
      });
    };

    AppImporter.prototype.createInterfaces = function (interfacedefs, next) {
      var self = this;
      self.logger.info('createInterfaces()');
      self.utils.for_each_then_call_next(interfacedefs, function (interfacedef, fn_next) {
        self.createInterface(interfacedef, fn_next);
      }, next);
    };

    AppImporter.prototype.createInterface = function (interfacedef, next) {
      var self = this;
      self.logger.info('createInterface()');
      self.utils.exists(self.rootNode, interfacedef.file_path, function (exists) {
        if (!exists) {
          self.logger.info('creating interface: ' + interfacedef.name);
          self.utils.md(self.rootNode, interfacedef.file_path, function (end_node) {
            var interface_node = self.core.createNode({
              base: self.META.Interface_Definition,
              parent: end_node
            });
            self.core.setAttribute(interface_node, 'name', interfacedef.name);
            self.core.setAttribute(interface_node, 'path', interfacedef.file_path);
            next();
          });
        } else {
          self.logger.info('skipping creating interface: ' + interfacedef.name);
          next();
        }
      });
    };

    AppImporter.prototype._createAppNode = function (app_info, file, next) {
      var self = this;
      getAppsFolder(function (apps_node) {
        var app_node = self.core.createNode({
          base: getBase(app_info),
          parent: apps_node
        });
        self.core.setAttribute(app_node, 'name', app_info.name);
        self.core.setAttribute(app_node, 'safe', app_info.safe);
        self.core.setAttribute(app_node, 'path', app_info.file_path);
        self.core.setAttribute(app_node, 'source', file);
        next(app_node);
      });

      function getBase (component) {
        if (component.comp_type == 'Module') {
          return component.generic ?
            self.META.Generic_Module : self.META.Module;
        }
        return component.generic ?
          self.META.Generic_Configuration : self.META.Configuration;
      }

      function getAppsFolder (next) {
        self.core.loadChildren(self.rootNode, function(err, children) {
          if (err) {
            next(null);
          } else {
            for (var i = children.length - 1; i >= 0; i--) {
              var name = self.core.getAttribute(children[i], 'name');
              if (name == 'apps') {
                return next(children[i]);
              }
            }
            var apps_node = self.core.createNode({
              base: self.META.Folder,
              parent: self.rootNode
            });
            self.core.setAttribute(apps_node, 'name', 'apps');
            return next(apps_node);
          }
        });
      }
    };

    return AppImporter;
  }
);
