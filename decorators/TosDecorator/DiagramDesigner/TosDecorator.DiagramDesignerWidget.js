define([ 'decorators/ModelDecorator/DiagramDesigner/ModelDecorator.DiagramDesignerWidget'
       ],
function (ModelDecoratorDiagramDesignerWidget) {

  'use strict';

  /**
   * @constructor
   * @augments ModelDecoratorDiagramDesignerWidget
   */
  var TosDecoratorDiagramDesignerWidget = function (options) {
    ModelDecoratorDiagramDesignerWidget.call(this, options);
  };
  _.extend(TosDecoratorDiagramDesignerWidget.prototype, ModelDecoratorDiagramDesignerWidget.prototype);

  return TosDecoratorDiagramDesignerWidget;

});
