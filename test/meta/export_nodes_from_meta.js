var arg = process.argv[2];
if (!arg) {
  console.log('provide a file');
  process.exit(1);
}

var fs = require('fs');
var path = require('path');
var meta_json = require(path.join(process.cwd(), arg));
var nodes = meta_json.nodes;

var exp_nodes = {};
for (var key in nodes) {
  var name = nodes[key].attributes.name;
  if (name === 'ROOT') continue;
  exp_nodes[name] = {};
}

fs.writeFileSync(
  path.join(__dirname, 'gen-' + arg.split('/').slice(-1)),
  JSON.stringify(exp_nodes, null, '  ')
);

fs.writeFileSync(
  path.join(__dirname, 'nodes.json'),
  JSON.stringify(exp_nodes, null, '  ')
);
