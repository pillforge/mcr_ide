define([
  'text!./SourceDetailsDialog.html',
  // '../../lib/codemirror.min',
  '../../lib/CodeMirror/lib/codemirror',
  'css!../../lib/CodeMirror/lib/codemirror',
  '../../lib/CodeMirror/mode/clike/clike',
  '../../lib/CodeMirror/addon/hint/show-hint',
  'css!../../lib/CodeMirror/addon/hint/show-hint',
  'css!../../css/show-hint-webgme'
  // '../../lib/CodeMirror/addon/hint/anyword-hint'
  ],
  function(sourceDetailsDialogTemplate, CodeMirror) {

    "use strict";

    var SourceDetailsDialog = function() {
    };

    SourceDetailsDialog.prototype.show = function(name, val, autocompleteData, saveCallback) {
      var self = this;
      self._init(name, val, autocompleteData,saveCallback);
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

    SourceDetailsDialog.prototype._init = function(name, val, autocompleteData, saveCallback) {
      var self = this;
      self._dialog = $(sourceDetailsDialogTemplate);
      
      self._el = self._dialog.find('.modal-body').first();
      self._pScript = self._el.find('#pScript').first();
      self._scriptEditor = self._pScript.find('div.controls').first();

      self._registerHelper(autocompleteData);
      CodeMirror.commands.autocomplete = function(cm) {
        cm.showHint({hint: CodeMirror.hint.nesc});
      };

      self._codeMirror = CodeMirror(self._scriptEditor[0], {
        value: val,
        lineNumbers: true,
        tabSize: 2,
        autofocus: true,
        extraKeys: {
          "Ctrl-Space": "autocomplete",
          "'.'": function(cm) {
            setTimeout(function(){cm.execCommand("autocomplete");}, 100);
            return CodeMirror.Pass; // tell CodeMirror we didn't handle the key
          }
        },
        mode: "text/x-nesc"
      });

      self._header = self._dialog.find('h3').first();
      self._header.html('Implementation of ' + name);
      
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

    SourceDetailsDialog.prototype._registerHelper = function (autocompleteData) {
      CodeMirror.registerHelper("hint", "nesc", function(editor, options) {
        var WORD = /[\w$]+/, RANGE = 500;
        var word = options && options.word || WORD;
        var range = options && options.range || RANGE;
        var cur = editor.getCursor(), curLine = editor.getLine(cur.line);
        var start = cur.ch, end = start;
        while (end < curLine.length && word.test(curLine.charAt(end))) ++end;
        while (start && word.test(curLine.charAt(start - 1))) --start;
        var curWord = start != end && curLine.slice(start, end);

        var list = [], seen = {};
        if ( curLine.charAt(cur.ch - 1) == '.' ) {
          var component = curLine.substr(0, cur.ch - 1).split(/\s/).pop();
          if ( autocompleteData[component] ) {
            list = autocompleteData[component];
          }
          return {list: list, from: CodeMirror.Pos(cur.line, start), to: CodeMirror.Pos(cur.line, end)};
        }

        var re = new RegExp(word.source, "g");
        for (var dir = -1; dir <= 1; dir += 2) {
          var line = cur.line, endLine = Math.min(Math.max(line + dir * range, editor.firstLine()), editor.lastLine()) + dir;
          for (; line != endLine; line += dir) {
            var text = editor.getLine(line), m;
            while (m = re.exec(text)) {
              if (line == cur.line && m[0] === curWord) continue;
              if ((!curWord || m[0].lastIndexOf(curWord, 0) == 0) && !Object.prototype.hasOwnProperty.call(seen, m[0])) {
                seen[m[0]] = true;
                list.push(m[0]);
              }
            }
          }
        }
        return {list: list, from: CodeMirror.Pos(cur.line, start), to: CodeMirror.Pos(cur.line, end)};
      });
    };

    return SourceDetailsDialog;

  });