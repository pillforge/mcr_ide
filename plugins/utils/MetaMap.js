// Allows plugins to use different MetaModels by importing different MetaMap in WebgmeUtils
define([], function () {

  'use strict';

  return {
    Configuration: 'Configuration',
    Module: 'Module',
    GenericConfiguration: 'Generic_Configuration',
    GenericModule: 'Generic_Module',
    Folder: 'Folder',
    Uses: 'Uses_Interface',
    Provides: 'Provides_Interface'
  };

});
