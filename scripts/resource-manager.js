ResourceManager = (function() {
    var resources = [];
    var resource_types = {};

    function isDuplicate(name) {
        var duplicated = false;
        $.each(resources, function(index, value) {
            if(value.name == name) {
                duplicated = true;
                return false;
            }
        });
        return duplicated;
    }

    function addResource(resource) {
        if(isDuplicate(resource.name)) {
            return false;
        }
        resources[resources.length] = resource;

        // Add it to the visible resource list.
        $('#resource-list').append('<li data-resource="' + resource.name + '"><strong>' + resource.name + '</strong> <a href="#" class="close">&times</a></li>')

        return true;
    }

    function setupBlocks(resource, parent) {
        var list = parent.find('select');
        list.each(function() {
            var v = $(this).val();
            if(v != "") {
                resource.addBlockWaitFor(v);
            }
        });
    }

    function saveGenericResource() {
        if($('#modal-resource-name').val() == "") {
            $('#custom-resource-message').html("<div class='alert alert-error'><strong>Failed.</strong> You must specify a resource name.</div>");
            return;
        }
        var name = $('#modal-resource-name').val();
        var resource = new Resource(name);
        if(!addResource(resource)) {
            $('#custom-resource-message').html("<div class='alert alert-error'><strong>Failed.</strong> There already exists a '" + name + "' resource.</div>");
            return false;
        } else {
            setupBlocks(resource, $('#custom-resource-modal .block-list'));
            $('#custom-resource-modal').modal('hide');
        }
    }

    // Lets us create an object using an array listing its args.
    var createObject = function() {
        function dummy() {};
        return function(obj, args){
            dummy.prototype = obj.prototype;
            var instance = new dummy();
            obj.apply(instance, args);
            return instance;
        }
    }();

    function saveCustomResource(shortname, dialog) {
        dialog = $(dialog);
        var resource = resource_types[shortname];
        var name = dialog.find('.resource-name').val();
        var args = [name];
        var i = 0;
        dialog.find('input.resource-property').each(function() {
            var prop = resource.properties[i++];
            var val = $(this).val();
            if(prop.numeric) {
                val = parseInt(val) || undefined;
            }
            args.push(val);
        });
        var res = createObject(resource.object, args);

        if(!addResource(res)) {
            dialog.find('.message-holder').html("<div class='alert alert-error'><strong>Failed.</strong> There already exists a '" + name + "' resource.</div>");
            return false;
        } else {
            dialog.modal('hide');
        }
    }

    function generateBlockList(parent) {
        var list = $(parent).find('.block-list');
        var entry = $('<select class="block-list-entry span1"><option value="">(none)</select>');
        list.append(entry);
        $.each(resources, function() {
            entry.append('<option value="'+this.name+'">'+this.name+'</option>');
        });
    }

    function createResource(shortname, name, defaultName, object, properties) {
        resource_types[shortname] = {'shortname': shortname, 'name': name, 'object': object, 'properties': properties};
        var html = '<div class="modal fade" id="resource-'+shortname+'-modal">' +
            '<div class="modal-header">' + 
                '<a class="close" data-dismiss="modal">x</a>' +
                '<h3>' + name + '</h3>' +
            '</div>'+
            '<div class="modal-body">' + 
                '<div class="message-holder"></div>' + 
                '<form class="form-horizontal">' +
                    '<fieldset>' + 
                        '<div class="control-group">' +
                            '<label class="control-label">Resource Name</label>' +
                            '<div class="controls">' +
                                '<input type="text" class="input-large resource-name" value="' + defaultName + '">' +
                                '<p class="help-block">The name/type of the resource; used when other resources refer to it.</p>' +
                            '</div>' + 
                        '</div>';
        var i = 0;
        $.each(properties, function() {
            html += '   <div class="control-group">' +
                            '<label class="control-label">' + this.name + '</label>' +
                            '<div class="controls">' +
                                (this.unit ? '<div class="input-append">' : '') +
                                '<input type="text" class="'+ (this.numeric ? 'span1' : 'input-large') +' resource-property" data-propnum="' + i + '"' + 
                                    (this.value ? ' value="' + this.value + '"' : '') +
                                    (this.placeholder ? ' placeholder="' + this.placeholder + '"' : '') + '>' +
                                (this.unit ? '<span class="add-on">' + this.unit + '</span></div>' : '') +
                                (this.help ? '<p class="help-block">' + this.help + '</p>' : '') +
                            '</div>' +
                        '</div>';
            ++i;

        });
        html += '       <div class="control-group">' + 
                            '<label class="control-label">Blocks Resources</label>' +
                            '<div class="controls">' +
                                '<span class="block-list">' +
                                '</span>'+
                                '<a href="#" class="btn blocklist-add"><i class="icon-plus"></i></a>' +
                            '</div>' +

                        '</div>' +
                    '</fieldset>' +
                '</form>' +
            '</div>'+ 
            '<div class="modal-footer">' +
                '<a href="#" class="btn" data-dismiss="modal">Cancel</a>' +
                '<a href="#" class="btn btn-primary save-btn">Save</a>' +
            '</div>' +
        '</div>';

        var element = $(html);

        element.find('.save-btn').click(function() {
            saveCustomResource(shortname, element);
        });
        element.find('form').submit(function() {
            return false;
        });

        element.find('.blocklist-add').click(function() {
            generateBlockList($(this).parent());
        })

        $(document).append(element);

        var menuEntry = $('<li><a href="#">' + name + '</a></li>').click(function() {
            element.find('.message-holder').html('');
            element.find('.resource-name').val(defaultName);
            var i = 0;
            element.find('.resource-property').each(function() {
                $(this).val(properties[i].value !== undefined ? properties[i].value : '');
                i++;
            });
            element.find('.block-list').html('');
            element.modal({'backdrop': 'static'});
        });
        $('#resource-type-menu').prepend(menuEntry);
    }

    $(function() {
        $('#modal-resource-save').click(saveGenericResource);
        $('.blocklist-add').click(function() {
            generateBlockList($(this).parent());
        })

        // Handle all the resource close buttons by handling all clicks inside the resource list,
        // checking if it came from a close button, then finding the list item it's inside.
        $('#resource-list').click(function(e) {
            var origin = $(e.target).closest('a.close').closest('li');
            var resource = origin.attr('data-resource');
            if(resource) {
                origin.remove();
                $.each(resources, function(index) {
                    if(this.name == resource) {
                        resources.splice(index, 1);
                        return false;
                    }
                });
            }
        });
    });

    return {
        addGeneric: function() {
            $('#modal-resource-name').val('');
            $('#custom-resource-message').html('');
            $('#custom-resource-modal .block-list').html('');
            $('#custom-resource-modal').modal({'backdrop': 'static'});
        },
        resources: function() {
            return resources.slice();
        },
        fixReferences: function(simulation) {
            resources = simulation.resourceList.slice();
        },
        resetAll: function() {
            $.each(resources, function() {
                this.reset();
            });
        },
        clear: function() {
            resources = [];
            $('#resource-list').html('');
        },
        bulkLoad: function(resourceList) {
            $.each(resourceList, function() {
                if(!addResource(this)) {
                    alert("Cannot add resource with duplicate name.");
                }
            });
        },
        addType: function(shortname, name, defaultName, object, properties) {
            createResource(shortname, name, defaultName, object, properties);
        }
    }
})();
