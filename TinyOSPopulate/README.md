### Description

TinyOSPopulate is a server side plugin that creates base TinyOS components.

### Usage

1. Create a new project by importing the file **meta_tinyos.json** in the root directory.
2. Set the desired platform in **config.json**. Default is *'exp430'*.
3. Run the plugin
```
node node_modules/webgme/src/bin/run_plugin.js \
  -c config.json \
  -p <project_name> \
  -b <branch_name> \
  -n TinyOSPopulate
```
