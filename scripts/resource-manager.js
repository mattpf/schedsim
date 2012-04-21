ResourceManager = (function() {
    var resources = [];

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
            $('#custom-resource-modal').modal('hide');
        }
    }

    function saveRRCPU() {
        var name = $('#rrcpu-name').val();
        var quantum = parseInt($('#rrcpu-quantum').val()) || undefined;
        var cores = parseInt($('#rrcpu-cores').val()) || undefined;

        if(name == "") {
            $('#rrcpu-message').html("<div class='alert alert-error'><strong>Failed.</strong> You must specify a resource name.</div>");
            return;
        }

        var resource = new RoundRobinCPU(name, quantum, cores);
        if(!addResource(resource)) {
            $('#rrcpu-message').html("<div class='alert alert-error'><strong>Failed.</strong> There already exists a '" + name + "' resource.</div>");
            return false;
        } else {
            $('#rrcpu-modal').modal('hide');
        }
    }

    $(function() {
        $('#modal-resource-save').click(saveGenericResource);
        $('#rrcpu-save').click(saveRRCPU);

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
            $('#custom-resource-modal').modal({'backdrop': 'static'});
        },
        addCPU: function() {
            $('#rrcpu-name').val('CPU');
            $('#rrcpu-quantum').val('50');
            $('#rrcpu-cores').val('1');
            $('#rrcpu-message').html('');
            $('#rrcpu-modal').modal({'backdrop': 'static'});
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
        }
    }
})();
