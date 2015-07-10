define(['../common/NesC_XML_Generator', '../common/ParseDump', 'path'],
function (NXG, ParseDump, path) {

'use strict';

return {

  getBase: function (c_json) {
    return ( c_json.generic ? 'Generic' : '' ) + c_json.comp_type;
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
  }
};

});
