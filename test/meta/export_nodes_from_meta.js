var meta_json = require('../../plugins/TinyOSPopulater/mcr_meta');
var fs = require('fs');

var nodes = meta_json.nodes;

var exp_nodes = {};
for (var key in nodes) {
  var name = nodes[key].attributes.name;
  if (name === 'ROOT') continue;
  exp_nodes[name] = {};
}

fs.writeFileSync('nodes_generated.json', JSON.stringify(exp_nodes, null, '  '));
