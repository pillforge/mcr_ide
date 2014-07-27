define(['text!./SourceDetailsDialog.html', 'codemirror'],
  function(sourceDetailsDialogTemplate, CodeMirror) {

    "use strict";

    var SourceDetailsDialog = function() {
    };

    SourceDetailsDialog.prototype.show = function(val, saveCallback) {
      var self = this;
      self._init(val, saveCallback);
      self._dialog.modal('show');
      self._dialog.on('shown.bs.modal', function() {
        self._codeMirror.refresh();
      });
      self._dialog.on('hidden.bs.modal', function() {
        self._dialog.remove();
        self._dialog.empty();
        self._dialog = undefined;
      });
    };

    SourceDetailsDialog.prototype._init = function(val, saveCallback) {
      var self = this;
      
      self._dialog = $(sourceDetailsDialogTemplate);
      self._el = self._dialog.find('.modal-body').first();
      self._pScript = self._el.find('#pScript').first();
      self._scriptEditor = self._pScript.find('div.controls').first();
      self._codeMirror = CodeMirror(self._scriptEditor[0], {
        value: val,
        mode: 'javascript'
      });
      
      self._btnSave = self._dialog.find('.btn-save').first();
      self._btnSave.on('click', function (event) {
          var val = self._codeMirror.getValue();
          event.stopPropagation();
          event.preventDefault();
          if (saveCallback) {
            saveCallback.call(self, val);
          }
      });
    };

    return SourceDetailsDialog;

  });