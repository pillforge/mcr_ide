define(['logManager'], function (logManager) {

  var WebGMEAnalyzer = function (core, META) {
    this.core = core;
    this.META = META;
    this.logger = logManager.create('WebGMEAnalyzer');
  };

  WebGMEAnalyzer.prototype.getComponents = function (node, next) {
    var self = this;
    self.logger.info('getComponents(..)');
    self.core.loadChildren(node, function (err, children) {
      if (err) {
        self.logger.error(err);
        next(err, null);
        return;
      }
      var components = {};
      for (var i = children.length - 1; i >= 0; i--) {
        var child = children[i];
        var name = self.core.getAttribute(child, 'name');
        var base_type = self.core.getBaseType(child);
        var base_type_name = self.core.getAttribute(base_type, 'name');
        if (!components[base_type_name]) {
          components[base_type_name] = [];
        }
        components[base_type_name].push(child);
      }
      next(null, components);
    });
  };

  return WebGMEAnalyzer;

});
