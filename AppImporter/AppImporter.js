define(
  ['plugin/PluginBase',
  'plugin/PluginConfig',
  'logManager',
  '../package.json',
  '../config.json',
  '../TinyOSPopulate/NesC_XML_Generator',
  '../TinyOSPopulate/ParseDump',
  '../ModelGenerator/Refresher'
  ],
  function (PluginBase, PluginConfig, LogManager, pjson, config_json, NesC_XML_Generator, ParseDump, Refresher) {
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

      var fs = require('fs');
      var path = require('path');

      var nxg = new NesC_XML_Generator(self.platform);

      var app_name = 'Icra2015ExptBaseAppC';
      var file_path = '/home/hakan/Documents/tinyos-apps/Icra2015Expt/Base/Icra2015ExptBaseAppC.nc';
      var dir_path = path.dirname(file_path);
      var file = fs.readFileSync(file_path, 'utf8');

      var opts = '-I ' + dir_path;
      opts += ' -I /home/hakan/Documents/tinyos-apps/Icra2015Expt/include/';

      nxg.getXML(path.resolve(file_path), opts, function (error, xml) {
        if (error !== null) {
          var err_msg = 'err in getXML';
          self.logger.error(err_msg + ': ' + error);
          self.result.setSuccess(false);
          self.createMessage(null, err_msg);
          callback(error, self.result);
        } else {
          var pd = new ParseDump();
          var app_json = pd.parse(null, xml);
          var r = new Refresher(self.core, self.META, app_json);
          // console.log(app_json);
          self._createAppNode(app_json.components[app_name], file, function (app_node) {
            r.update(app_node, app_name, function () {
              self.save('Save AppImporter changes', function () {
                self.result.setSuccess(true);
                self.createMessage(app_node, '');
                callback(null, self.result);
              });
            });
          });
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
