/*
 * Copyright (C) 2014 Vanderbilt University, All rights reserved.
 *
 * Author: Zsolt Lattmann
 *
 * Server side configuration file for all tests.
 */

// var PATH = require('path');

var gmeConfig = require('./config');
var webgme = require('webgme');
var requirejs = webgme.requirejs;

webgme.addToRequireJsPaths(gmeConfig);

exports.requirejs = requirejs;
