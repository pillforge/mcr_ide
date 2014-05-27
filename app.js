/**
 * Created by Zsolt on 3/17/14.
 */

var config = require('./config.json'),
    webgme = require('webgme');

webGMEGlobal.setConfig(config);


var myServer = new webgme.standaloneServer();
myServer.start();
