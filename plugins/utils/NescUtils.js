define(['../common/NesC_XML_Generator', '../common/ParseDump', 'path'],
function (NXG, ParseDump, path) {

'use strict';

return {

  getBaseInterface: function () {
    return 'Interface';
  },

  getBaseComp: function (c_json) {
    return ( c_json.generic ? 'Generic' : '' ) + c_json.comp_type;
  },

  getBaseUP: function (i_type) {
    if (i_type.provided) return 'Provides';
    return 'Uses';
  },

  getAppJson: function (c_path, next) {
    var nxg = new NXG();
    var opts = '-I' + path.dirname(c_path);
    nxg.getXML(c_path, opts, function (err, xml) {
      if (err) {
        return next(err);
      } else {
        var app_json = ParseDump.parse(xml);
        return next(null, app_json);
      }
    });
  },

  getNccFromMake: function (d_path, target) {
    var execSync = require('child_process').execSync;
    return execSync('make -n ' + target + ' | grep ncc', {
      cwd: d_path,
      encoding: 'utf8'
    });
  },

  isModule: function (c_json) {
    return c_json.comp_type === 'Module';
  }

};

});
