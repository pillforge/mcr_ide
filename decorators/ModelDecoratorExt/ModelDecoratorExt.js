"use strict";

define(['js/Decorators/DecoratorBase',
    './DiagramDesigner/ModelDecorator.DiagramDesignerWidget',
    './PartBrowser/ModelDecorator.PartBrowserWidget'], function (
                                                           DecoratorBase,
                                                           ModelDecoratorDiagramDesignerWidget,
                                                           ModelDecoratorPartBrowserWidget) {

    var ModelDecoratorExt,
        __parent__ = DecoratorBase,
        __parent_proto__ = DecoratorBase.prototype,
        DECORATOR_ID = "ModelDecoratorExt";

    ModelDecoratorExt = function (params) {
        var opts = _.extend( {"loggerName": this.DECORATORID}, params);

        __parent__.apply(this, [opts]);

        this.logger.debug("ModelDecoratorExt ctor");
    };

    _.extend(ModelDecoratorExt.prototype, __parent_proto__);
    ModelDecoratorExt.prototype.DECORATORID = DECORATOR_ID;

    /*********************** OVERRIDE DecoratorBase MEMBERS **************************/

    ModelDecoratorExt.prototype.initializeSupportedWidgetMap = function () {
        this.supportedWidgetMap = {'DiagramDesigner': ModelDecoratorDiagramDesignerWidget,
            'PartBrowser': ModelDecoratorPartBrowserWidget};
    };

    return ModelDecoratorExt;
});