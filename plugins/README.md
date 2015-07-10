TinyOSPopulate is the main plugin that generates the TOS in WebGME. It saves some registry values in WebGME objects. Some other plugins assume these reigstry values are set.

ROOT object has two registry records: configuration_paths and module_paths. They keep the paths of components in the following format:
```
{ MainC: '/497022377/1117940255/1637150336' }
```

The recent plugins keep nodes in the following format:
```
{ "MainC": <WebGME object>, "MainC__Scheduler": <WebGME object> }
```
