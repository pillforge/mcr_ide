// Allows plugins to use different MetaModels by importing different MetaMap in WebgmeUtils
define([], function () {

  'use strict';

  return {
    Folder: 'Folder',
    Interface: 'Interface_Definition',
    Configuration: 'Configuration',
    Module: 'Module',
    GenericConfiguration: 'Generic_Configuration',
    GenericModule: 'Generic_Module',
    Uses: 'Uses_Interface',
    Provides: 'Provides_Interface'
  };

});
