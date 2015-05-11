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

  /**
   * Returns the children of the object and the referred interface's children
   * @override
   */
  TosDecoratorDiagramDesignerWidget.prototype.getPortIDs = function () {
    var children_ids = ModelDecoratorDiagramDesignerWidget.prototype.getPortIDs.call(this);
    
    var client = this._control._client;
    var node_obj = client.getNode(this._metaInfo.GME_ID);

    if (_.contains(node_obj.getPointerNames(), 'interface') ) {
      var pointer_id = node_obj.getPointer('interface').to;
      var pointer_obj = client.getNode(pointer_id);
      if (pointer_obj) {
        children_ids = children_ids.concat(pointer_obj.getChildrenIds());
      }
    }

    return children_ids;
  };

  return TosDecoratorDiagramDesignerWidget;

});
