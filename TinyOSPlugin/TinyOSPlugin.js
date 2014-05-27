define(['module', 'dot', 'plugin/PluginBase', 'plugin/PluginConfig', 'core/metacore', 'fs', 'path'],
       function (module, doT, PluginBase, PluginConfig, MetaCore, fs, path) {
    "use strict";

    doT.templateSettings.strip = false;

    // module.uri is the path of this file.
    var plugin_dir = path.dirname(module.uri);
    console.log("Module: " + module.uri);
    console.log("plugin_dir: " + plugin_dir);

    var TinyOSPlugin = function () {
        PluginBase.call(this);
    };

  //basic functions and setting for plugin inheritance
    TinyOSPlugin.prototype = Object.create(PluginBase.prototype);
    TinyOSPlugin.prototype.constructor = TinyOSPlugin;
    TinyOSPlugin.prototype.getName = function () {
        return "TinyOS Plugin";
    };


    TinyOSPlugin.prototype.main = function (callback) {


        // Wrap in meta core to get the nice META type checking
        var core = new MetaCore(config.core);
        var result = {commitHash:config.commitHash};

        var getName = function (node){
            return core.getAttribute(node, 'name');
        }

        // populate a new object with enough information necessary for a template
        var createComponent = function(node){
            var base = getName(core.getBase(node));
            var name_as  = getName(node);
            var out = {'base': base};
            if (base !== name_as)
                out['name'] = name_as;

            return out;
        };


        var generate_output = function(app, components, generic_components, wirings){
            debugger;

            var output_dir = path.resolve(plugin_dir, "output");
            // Create output_dir if it doesn't already exist
            try{
                fs.mkdirSync(output_dir);
            }catch(e){}

            // Read template file from plugin directory
            var app_tmpl = fs.readFileSync(path.resolve(plugin_dir, "app.nc.tmpl"), 'utf8');
            var makefile_tmpl = fs.readFileSync(path.resolve(plugin_dir, "makefile.tmpl"), 'utf8');

            var app_template = doT.template(app_tmpl);
            var makefile_template = doT.template(makefile_tmpl);

            console.log("Output:");
            var wirings_for_tmpl = [];
            wirings.forEach(function(node){
                wirings_for_tmpl.push(
                    {
                        src: getName(node.src.parent) + "." + getName(node.src),
                        dst: getName(node.dst.parent) + "." + getName(node.dst)
                    }
                );
            });

            debugger;
            var tmpl_context = {
                app: createComponent(app),
                components:components.map(createComponent),
                generic_components:generic_components.map(createComponent),
                wirings: wirings_for_tmpl
            };
            // Generate App file
            var output = app_template(tmpl_context);
            console.log(output);
            var output_file = path.resolve(output_dir, tmpl_context.app.name + ".nc");
            fs.writeFileSync(output_file, output);


            // Generate Makefile
            var output = makefile_template(tmpl_context);
            console.log(output);
            var output_file = path.resolve(output_dir, "Makefile");
            fs.writeFileSync(output_file, output);

            // Populate module files
            components.concat(generic_components).forEach(function(comp){
                if(core.isTypeOf(comp, config.META.Module) || core.isTypeOf(comp, config.META.Generic_Module) ){
                    var output_file = path.resolve(output_dir,getName(comp) +".nc");
                    var input_file = core.getAttribute(comp, "path")
                    if(input_file)
                        fs.createReadStream(input_file).pipe(fs.createWriteStream(output_file));
                }
            });

            result.success = true;
            callback("Files generated", result);

        }


        if(core){
            // Check if selectedNode or active object is an App
            var app_node = config.selectedNode;
            var self = this;
            if (core.isTypeOf(app_node, config.META.App)){
                config.core.loadChildren(app_node,function(err, children){
                    if(!err){
                        var components = [];
                        var generic_components = [];
                        var wirings = []
                        var wiring_count = 0;

                        //console.log("Length: " + children.length);

                        for(var i=0;i<children.length;i++){
                            if (core.isTypeOf(children[i], config.META.Generic_Configuration) || 
                                core.isTypeOf(children[i], config.META.Generic_Module)){
                                generic_components.push(children[i]);
                            }else if (core.isTypeOf(children[i], config.META.Configuration) ||
                                      core.isTypeOf(children[i], config.META.Module)){
                                components.push(children[i]);
                            }else if  (core.isTypeOf(children[i], config.META.Wiring)){
                                (function(){
                                    // create a function to create a closure for cur_child
                                    var cur_child = children[i];
                                    wiring_count++;
                                    core.loadPointer(children[i], 'src', function(err, src_node){
                                        //debugger;
                                        console.log("Src: " + getName(src_node.parent) + "." + getName(src_node));
                                        cur_child.src = src_node;
                                        if(cur_child.dst) wirings.push(cur_child);
                                        if(wiring_count === wirings.length)
                                            generate_output(app_node, components, generic_components, wirings);
                                    });
                                    core.loadPointer(children[i], 'dst', function(err, dst_node){
                                        //debugger;
                                        cur_child.dst = dst_node;
                                        console.log("Dst: " + getName(dst_node.parent) + "." + getName(dst_node));
                                        if(cur_child.src) wirings.push(cur_child);
                                        if(wiring_count === wirings.length)
                                            generate_output(app_node, components, generic_components, wirings);
                                    });
                                })();

                            }
                            
                        }
                    }else{
                        result.success = false;
                        callback(err, result);
                    }
                });

            } else {
                result.success = false;
                callback( "An App must be selected.", result);
            }
        }

    };

    return TinyOSPlugin;
});
