var Docker = require('dockerode');

var docker = new Docker({socketPath: '/var/run/docker.sock'});

docker.run('ubuntu', ['bash', '-c', 'uname -a'], process.stdout, function (err, data, container) {
  if(err){
    console.log(err);
    return
  }
  console.log(data.StatusCode);
});
