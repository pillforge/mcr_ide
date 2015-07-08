define(
  ['plugin/PluginBase',
  'plugin/PluginConfig',
  '../../package.json',
  '../common/NesC_XML_Generator',
  '../common/ParseDump',
  '../common/Util'
  ],
  function (PluginBase, PluginConfig, pjson, NesC_XML_Generator, ParseDump, Util) {
    "use strict";

    var TestPlugin = function () {
      PluginBase.call(this);
    };

    TestPlugin.prototype = Object.create(PluginBase.prototype);
    TestPlugin.prototype.constructor = TestPlugin;
    TestPlugin.prototype.getName = function () {
      return "TestPlugin";
    };
    TestPlugin.prototype.getVersion = function () {
      return pjson.version;
    };
    TestPlugin.prototype.getDefaultConfig = function () {
      return new PluginConfig();
    };
    TestPlugin.prototype.getDescription = function () {
      return 'This plugin is used for test purposes';
    };

    TestPlugin.prototype.main = function (callback) {
      var self = this;
      self.logger.info('main()');
      this.util = new Util(this.core, this.META);

      debugger;

      self.analyzeObjectStorage(function (err, nodes) {
        if (err) {

        } else {
          console.log(nodes);
          debugger;
          self.result.setSuccess(true);
          callback(null, self.result);
        }
      });

      // self.createMcrMeta(function() {
      //   self.result.setSuccess(true);
      //   self.save('meta is populated', function (err) {
      //     callback(null, self.result);
      //   });
      //   // callback(null, self.result);
      // });

      // self.getAppJson(function (err, result) {
      //   console.log(JSON.stringify(result, null, ' '));
      //   self.result.setSuccess(true);
      //   callback(null, self.result);
      // });

    };

    TestPlugin.prototype.analyzeObjectStorage = function(next) {
      var self = this;
      self.util.loadNodes(self.rootNode, function (err, nodes) {
        if (err) {
          next(err);
        } else {
          next(null, nodes);
        }
      });
    };

    TestPlugin.prototype.createMcrMeta = function(next) {
      // Create language folder ane make it to be able to contain FCO
      var self = this;
      var root = self.rootNode;
      self.core.loadByPath(root, '/1', function(err, fco) {
        // var language = self.core.createChild(root);
        // var language = self.core.createChild({parentId: '', baseId: '/1'});//, position: {x: 200, y: 300}});
        var language = self.core.createNode({
          base: fco,
          parent: root,
        });
        self.core.setAttribute(language, 'name', 'language');
        self.core.setChildMeta(language, fco, -1, -1);
        next();
      });
    };

    TestPlugin.prototype.getAppJson = function (next) {
      var self = this;
      var nxg = new NesC_XML_Generator('exp430');
      // var component_path = process.env.TOSDIR + '/system/MainC.nc';
      var component_path = process.env.TOSDIR + '/platforms/exp430/ActiveMessageC.nc';
      nxg.getXML(component_path, '', function(error, xml) {
        if (error !== null) {
          next(error);
        } else {
          // console.log(xml);
          var app_json = ParseDump.parse(xml);
          next(null, app_json);
        }
      });
    };

    TestPlugin.prototype.getDirectories = function (next) {
      var nxg = new NesC_XML_Generator('exp430');
      nxg.getDirectories(function(error, directories) {
        if (error !== null) {
          self._wi("Can't get platform directories");
        } else {
          var components_paths = nxg.getComponents(directories);
          console.log('directories');
          console.log(directories);
          console.log('components_paths');
          console.log(components_paths);
        }
        next();
      });
    };

    return TestPlugin;
  }
);
