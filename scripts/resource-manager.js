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

        $('#custom-resource-modal').modal('hide');
        return true;
    }

    function saveCurrentResource() {
        if($('#modal-resource-name').val() == "") {
            $('#custom-resource-message').html("<div class='alert alert-error'><strong>Failed.</strong> You must specify a resource name.</div>");
            return;
        }
        var name = $('#modal-resource-name').val();
        var resource = new Resource(name);
        if(!addResource(resource)) {
            $('#custom-resource-message').html("<div class='alert alert-error'><strong>Failed.</strong> There already exists a '" + name + "' resource.</div>");
            return false;
        }
    }

    $(function() {
        $('#modal-resource-save').click(saveCurrentResource);
        $('#resource-list').click(function(e) {
            var origin = $(e.target).closest('a.close').closest('li');
            var resource = origin.attr('data-resource');
            if(resource) {
                origin.remove();
                $.each(resources, function(index, value) {
                    if(value.name == resource) {
                        resources.splice(index, 1);
                        return false;
                    }
                });
            }
        });
    });

    return {
        prompt: function() {
            $('#modal-resource-name').val('');
            $('#custom-resource-modal').modal({'backdrop': 'static'});
        },
        resources: function() {
            return resources.slice();
        },
        addCPU: function() {
            if(!addResource(new Resource("CPU"))) {
                alert("Cannot add a CPU; one is already present.");
            }
        }
    }
})();
