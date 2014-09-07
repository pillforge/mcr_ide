define([], function () {

  var Refresher = function (core) {
    this.core = core;
  };

  Refresher.prototype.updateComponent = function (node, component) {
    var self = this;
    self.core.setAttribute(node, 'safe', component.safe);
  };

  return Refresher;
  
});
