var path = require('path');
var fs = require('fs');
var exec = require('child_process').exec;

var tinyos = '/home/hakan/tinyos';
var target = 'telosb';
var ncc_cmd = 'ncc' + 
  ' "-fnesc-dump=referenced(interfaces,components,functions)"' + 
  ' "-fnesc-dump=functions(!global())" "-fnesc-dump=interfaces"' +
  ' "-fnesc-dump=components(wiring)" -fnesc-dump=interfacedefs' +
  ' -fnesc-dump=wiring -fsyntax-only';

// // get directories from .platform file
// var dot_platform_path = tinyos + '/tos/platforms/' + target + '/.platform';
// var data = fs.readFileSync(dot_platform_path, { encoding: 'utf-8' });
// var directories = data.match(/(%T\/.*)/g);
// directories = directories.map(function(d) {
//   return d.replace('%T', tinyos + '/tos');
// });

get_directories(tinyos + '/tos/system/MainC.nc', get_components);

function get_directories(component_path, callback) {
  var dir = path.dirname(component_path);
  var component = path.basename(component_path);
  // process.chdir(dir);
  var dump_cmd = ncc_cmd + ' -v -target=' + target + ' ' + component;
  var options = { maxBuffer: 100*1024*1024, cwd: dir };
  exec(dump_cmd, options, function (error, stdout, stderr) {
    var ind = stderr.search('> search starts here:');
    var end = stderr.search('End of search list');
    var s = stderr.substring(ind, end + 19);
    var directories =  s.match(/(\/.*)/g);
    callback(directories);
    if (error !== null) {
      console.log('stderr: ' + stderr);
      console.log('exec error: ' + error);
    }
  });
}

function get_components(directories) {
  var components = [];
  var components_dict = {};
  for (var i = 0; i < directories.length; i++) {
    var dir = directories[i];
    if (fs.existsSync(dir)) {
      var files = fs.readdirSync(dir);
      for (var j = 0; j < files.length; j++) {
        if (path.extname(files[j]) == '.nc' && !components_dict[files[j]]) {
          components.push(dir + files[j]);
          components_dict[files[j]] = dir;
        }
      }
    }
  }
  // console.log(components.length);
  create_xml(components, 0);
  // create_xml(['/home/hakan/tinyos/apps/Blink/BlinkAppC.nc'], 0);
}

var out = '/home/hakan/nesc/out';
function create_xml(components, index) {
  if (index >= components.length) { console.log("over baby blue"); return; }
  var component_path = components[index];
  var dir = path.dirname(component_path);
  var component = path.basename(component_path);
  var xml_cmd = ncc_cmd + ' -target=' + target + ' ' + component;
  var options = { maxBuffer: 100*1024*1024, cwd: dir };
  exec(xml_cmd, options, function (error, stdout, stderr) {
    var fn = '00' + index;
    var f_name = fn.substr(fn.length - 3) + component + '.xml';
    fs.writeFileSync(out + '/' + f_name, stdout);
    console.log(f_name + ' saved');
    create_xml(components, index + 1);
    if (error !== null) {
      console.log('stderr: ' + stderr);
      console.log('exec error: ' + error + '####\n');
    }
  });
}
