define([ 'js/Decorators/DecoratorBase'
       , './DiagramDesigner/TosDecorator.DiagramDesignerWidget'
       , 'decorators/ModelDecorator/PartBrowser/ModelDecorator.PartBrowserWidget'
       ],
function (DecoratorBase, TosDecoratorDiagramDesignerWidget, ModelDecoratorPartBrowserWidget) {
  'use strict';

  var TosDecorator = function (params) {
    var opts = _.extend({loggerName: 'TosDecorator'}, params);
    DecoratorBase.apply(this, [opts]);
  };

  _.extend(TosDecorator.prototype, DecoratorBase.prototype);
  TosDecorator.prototype.DECORATORID = 'TosDecorator';

  TosDecorator.prototype.initializeSupportedWidgetMap = function () {
    this.supportedWidgetMap = {
      DiagramDesigner: TosDecoratorDiagramDesignerWidget,
      PartBrowser: ModelDecoratorPartBrowserWidget
    };
  };

  return TosDecorator;

});
