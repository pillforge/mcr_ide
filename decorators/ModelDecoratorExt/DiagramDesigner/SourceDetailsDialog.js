define([
  'text!./SourceDetailsDialog.html',
  // '../../lib/codemirror.min',
  '../../lib/CodeMirror/lib/codemirror',
  'css!../../lib/CodeMirror/lib/codemirror',
  'css!./SourceDetailsDialog',
  '../../lib/CodeMirror/mode/clike/clike',
  // '../../lib/CodeMirror/mode/javascript/javascript',
  '../../lib/CodeMirror/addon/hint/show-hint',
  'css!../../lib/CodeMirror/addon/hint/show-hint',
  '../../lib/CodeMirror/addon/hint/anyword-hint',
  '../../lib/CodeMirror/keymap/sublime'
  ],
  function(sourceDetailsDialogTemplate, CodeMirror) {

    "use strict";

    var SourceDetailsDialog = function() {
    };

    SourceDetailsDialog.prototype.show = function(name, val, autocompleteData, callback) {
      var self = this;
      self._init(name, val, autocompleteData, callback);
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

    SourceDetailsDialog.prototype._init = function(name, val, autocompleteData, callback) {
      var self = this;
      self._dialog = $(sourceDetailsDialogTemplate);
      self._scriptEditor = self._dialog.find('.modal-body').first();

      self._registerHelper(autocompleteData);
      CodeMirror.commands.autocomplete = function(cm) {
        cm.showHint({hint: CodeMirror.hint.anyword});
      };
      self._codeMirror = CodeMirror(self._scriptEditor[0], {
        value: val,
        lineNumbers: true,
        tabSize: 2,
        autofocus: true,
        extraKeys: {
          "Ctrl-Space": "autocomplete",
          "'.'": function(cm) {
            setTimeout(function () {
              cm.showHint({hint: CodeMirror.hint.nesc});
            }, 100);
            return CodeMirror.Pass; // tell CodeMirror we didn't handle the key
          }
        },
        keyMap: "sublime",
        mode: "text/x-nesc"
      });
      self._codeMirror.on('keyup', function (cm, ke) {
        if ( ke.altKey || ke.ctrlKey || ke.keyCode < 65 || ke.keyCode > 90) {
          return;
        }
        setTimeout(function () {
          cm.showHint({
            hint: CodeMirror.hint.nesc_keywords,
            completeSingle: false
          });
        }, 100);
      });
      self._codeMirror.on('keydown', function (cm, ke) {
        if ( ke.ctrlKey && ( ke.keyCode == 37 || ke.keyCode == 39 ) ) {
          ke.stopPropagation();
        }
      });

      self._header = self._dialog.find('h3').first();
      self._header.html('Implementation of ' + name);
      
      self._btnSave = self._dialog.find('.btn-save').first();
      self._btnSave.on('click', function (event) {
        var val = self._codeMirror.getValue();
        event.stopPropagation();
        event.preventDefault();
        if (callback) {
          callback.call(self, 'save', val);
        }
      });

      // Save and generate visuals
      self._btnSaveVisual = self._dialog.find('.gen-vis').first();
      self._btnSaveVisual.on('click', function (event) {
        var val = self._codeMirror.getValue();
        event.stopPropagation();
        event.preventDefault();
        if (callback) {
          callback.call(self, 'gen-vis', val);
        }
      });

      // Generate nesC Code
      self._btnGen = self._dialog.find('.gen-nesc').first();
      self._btnGen.on('click', function (event) {
        event.stopPropagation();
        event.preventDefault();
        if (callback) {
          callback.call(self, 'gen-code');
        }
      });

      // Compile & Download the App
      self._btnCompile = self._dialog.find('.compile').first();
      self._btnCompile.on('click', function (event) {
        var val = self._codeMirror.getValue();
        event.stopPropagation();
        event.preventDefault();
        if (callback) {
          callback.call(self, 'compile', val);
        }
      });

    };

    SourceDetailsDialog.prototype.createDownloadButton = function (url) {
      var self = this;
      var download_button = self._dialog.find('.download');//.first();
      if (download_button.length > 0) {
        window.URL.revokeObjectURL(download_button.attr('href'));
        var vers = Number(download_button.attr('v'));
        download_button.attr('href', url)
                      .attr('v', vers + 1)
                      .html('Download the App v' + (vers + 1));
      } else {
        var compile_button = self._dialog.find('.compile').first();
        compile_button.after('<a href="' + url + '" class="btn btn-danger download" download="app.c" v="0">Download the App</a>');
      }
    };

    SourceDetailsDialog.prototype.updateEditorText = function (value) {
      var self = this;
      self._codeMirror.setValue(value);
    };

    SourceDetailsDialog.prototype._registerHelper = function (autocompleteData) {
      CodeMirror.registerHelper("hint", "nesc_keywords", function (editor, options) {
        var word = /[\w$]+/;
        var cur = editor.getCursor(), curLine = editor.getLine(cur.line);
        var start = cur.ch, end = start;
        while (end < curLine.length && word.test(curLine.charAt(end))) ++end;
        while (start && word.test(curLine.charAt(start - 1))) --start;
        var curWord = start != end && curLine.slice(start, end);

        var list = [];
        for (var i = 0; i < nescKeywords.length; i++) {
          if ( nescKeywords[i].lastIndexOf(curWord, 0) == 0 ) {
            list.push(nescKeywords[i]);
          }
        };
        return {list: list, from: CodeMirror.Pos(cur.line, start), to: CodeMirror.Pos(cur.line, end)};
      });
      CodeMirror.registerHelper("hint", "nesc", function(editor, options) {
        var word = /[\w$]+/;
        var cur = editor.getCursor(), curLine = editor.getLine(cur.line);
        var start = cur.ch, end = start;
        while (end < curLine.length && word.test(curLine.charAt(end))) ++end;
        while (start && word.test(curLine.charAt(start - 1))) --start;

        var list = [], seen = {};
        if ( curLine.charAt(cur.ch - 1) == '.' ) {
          var component = curLine.substr(0, cur.ch - 1).split(/\s/).pop();
          if ( autocompleteData[component] ) {
            list = autocompleteData[component];
          }
          return {list: list, from: CodeMirror.Pos(cur.line, start), to: CodeMirror.Pos(cur.line, end)};
        }
      });
      var nescKeywords = ("as atomic async call command component components configuration event generic " +
          "implementation includes interface module new norace nx_struct nx_union post provides " +
          "signal task uses abstract extends").split(" ");
    };

    return SourceDetailsDialog;

  });
