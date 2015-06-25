define([], function () {

'use strict';

var ModuleCalls = function () {
  var variable_regex = '[a-zA-Z\\d]+';
  var interface_regex = '(' + variable_regex + ')';
  var function_regex = '(' + variable_regex + ')';
  var parameter_regex = '(\\[' + variable_regex + '\\])?';
  var any_character_regex = '[\\s\\S]*?';
  var argument_regex = '\\((' + any_character_regex + ')\\)';
  var call_regex_string = 'call ' + interface_regex +
    '.' + function_regex + parameter_regex + argument_regex;
  
  this.call_regex  = new RegExp(call_regex_string, 'g');

  var event_command_regex = '(event|command)';
  var implementation_regex = '{(' + any_character_regex + ')}';
  var func_regex_string = event_command_regex + any_character_regex + interface_regex +
    '.' + function_regex + '\\(' + any_character_regex + implementation_regex;

  this.function_regex = new RegExp(func_regex_string, 'g');
};


ModuleCalls.prototype.getCalls = function(source) {
  var result = {};
  var module_functions = this._getFunctions(source);
  for (var key in module_functions) {
    var interface_name = key.split('.')[0];
    var function_name = key.split('.')[1];
    result[interface_name] = result[interface_name] || {};
    result[interface_name][function_name] = this._getIndividualCalls(module_functions[key]);
  }
  return result;
};

ModuleCalls.prototype._getIndividualCalls = function (function_definition) {
  var result = [];
  var call = null;
  while ( (call = this.call_regex.exec(function_definition)) !== null ) {
    result.push([call[1], call[2]]);
  }
  return result;
};

ModuleCalls.prototype._getFunctions = function (source) {
  var result = {};
  var imp = null;
  while ( (imp = this.function_regex.exec(source)) !== null ) {
    var name = imp[2] + '.' + imp[3];
    result[name] = imp[4];
  }
  return result;
};

return ModuleCalls;

});
