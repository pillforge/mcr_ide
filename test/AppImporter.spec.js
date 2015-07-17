'use strict';

var requirejs = require('./config').requirejs;
var assert = require('assert');

describe('AppImporter', function () {

  var AppImporter = requirejs('plugin/AppImporter/AppImporter/AppImporter');
  var ai = new AppImporter();

  it('#getName()', function () {
    assert.equal(ai.getName(), 'AppImporter');
  });

});
