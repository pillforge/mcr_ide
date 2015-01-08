define(['fs', 'path', 'child_process', 'logManager'],
  function (fs, path, child_process, LogManager) {
    "use strict";

    var exec;
    var NesC_XML_Generator = function(target, tinyos) {
      var self = this;
      exec = child_process.exec;
      self._target = target || 'telosb';
      self._tinyos = tinyos || process.env.TOSROOT;
      self._ncc_cmd = 'ncc' + 
        ' "-fnesc-dump=referenced(interfaces,components,functions)"' + 
        ' "-fnesc-dump=functions(!global())" "-fnesc-dump=interfaces"' +
        ' "-fnesc-dump=components(wiring)" -fnesc-dump=interfacedefs' +
        ' -fnesc-dump=wiring -fsyntax-only';
      self.logger = LogManager.create('TinyOSPopulate.NesC_XML_Generator');
    };

    NesC_XML_Generator.prototype.getDirectories = function(callback) {
      var self = this;
      var component_path = self._tinyos + '/tos/system/MainC.nc';
      var dump_cmd = self._ncc_cmd + ' -v -target=' + self._target +
        ' ' + component_path;
      var options = { maxBuffer: 100*1024*1024 };
      exec(dump_cmd, options, function (error, stdout, stderr) {
        if (error !== null) {
          self.logger.error('stderr: ' + stderr);
          self.logger.error('exec error: ' + error);
          callback(error, null);
        } else {
          var ind = stderr.search('> search starts here:');
          var end = stderr.search('End of search list');
          var s = stderr.substring(ind, end + 19);
          var directories =  s.match(/(\/.*)/g);
          callback(null, directories);
        }
      });
    };

    NesC_XML_Generator.prototype.getComponents = function(directories) {
      var components = [];
      var components_dict = {};
      for (var i = 0; i < directories.length; i++) {
        var dir = directories[i];
        if (fs.existsSync(dir)) {
          var files = fs.readdirSync(dir);
          for (var j = 0; j < files.length; j++) {
            if (path.extname(files[j]) == '.nc' && 
                !components_dict[files[j]]) {
              components.push(dir + files[j]);
              components_dict[files[j]] = dir;
            }
          }
        }
      }
      return components;
    };

    NesC_XML_Generator.prototype.getXML = function(component_path, ncc_options, callback) {
      var self = this;
      var xml_cmd = self._ncc_cmd + ' -target=' + self._target +
        ' ' + component_path + ' ' + ncc_options;
      var options = { maxBuffer: 100*1024*1024 };
      exec(xml_cmd, options, function (error, stdout, stderr) {
        if (error !== null) {
          self.logger.error('stderr: ' + stderr);
          self.logger.error('exec error: ' + error + '####\n');
          callback(error, stdout);
        } else {
          callback(null, stdout);
        }
      });
    };

    return NesC_XML_Generator;
  }
);
