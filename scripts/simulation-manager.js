SimulationManager = (function() {
    var simluation = null;
    var colours = {};

    function updateEarlyState() {
        // Generate the collection of resources.
        $('#simulation-resource-boxes').html('');
        $.each(ResourceManager.resources(), function() {
            var html = '<div data-resource="' + this.name + '" class="state-box resource"><h4>' + this.name + '</h4><ul>' + 
                this.render() + '</ul></div>';
            $('#simulation-resource-boxes').append(html);
        });

        // Because rendering is done at the wrong level, the things we just rendered don't really have a clue what's going on.
        // More specifically, they don't know their own names. We fill those in now.
        // Since we're at it, we fill in their colours here as well.
        $('#simulation-resource-boxes > div > ul > li').each(function() {
            var pid = parseInt($(this).attr('data-pid'));
            $(this).css('background-color', 'hsl(' + colours[pid] + ', 75%, 75%)').find('span').html(simulation.getProcess(pid).name);
        });

        $('#last-event-string').html(simulation.lastEventString);
    }

    function updateLateState() {
        // Update the time display
        $('#time-passed').html(simulation.simulatorClock + "ms");

        // Update the progress bars in the process list
        var totalWaiting = 0;
        $.each(ProcessManager.processes(), function() {
            var p = $('#p' + this.pID);
            p.find('.bar').css('width', ((this.getRunDuration() / this.getTotalRunDuration()) * 100) + '%')
            p.find('.metrics').html(' – Waited: ' + this.getWaitDuration() + 'ms | Ran: ' + this.getRunDuration() + ' ms');
            totalWaiting += this.getWaitDuration();
        });

        // Generate the collection of processes. Each processes has a single colour value associated with it.
        // We then stick it into hsl(n, 100%, 75%) for something that's hopefully aesthetically pleasing.
        $('#simulation-process-boxes').html('');
        $.each(ProcessManager.processes(), function() {
            var process = this;
            if(colours[this.pID] === undefined) {
                colours[this.pID] = Math.random() * 360;
            }
            var blocking = '';
            if(!this.hasTerminated() && process.lastMissing.length) {
                $.each(process.lastMissing, function(index, value) {
                    blocking += '<li>Need ' + value + '</li>';
                });
                blocking = '<ul>' + blocking + '</ul>';
            }
            $('#simulation-process-boxes').append('<div data-pid="'+this.pID+'" class="state-box process" ' +
                'style="background-color: hsl('+colours[this.pID]+', 75%, 75%)"><h4>' + this.name + '</h4>' +
                blocking + 
                '</div>');
            if(this.hasTerminated()) {
                $('#simulation-process-boxes > div[data-pid=' + this.pID + ']').addClass('terminated');
            }
        });
    }

    function updateState() {
        updateEarlyState();
        updateLateState();
    }

    return {
        start: function() {
            // I have no idea what I'm supposed to do with the other two paramaters...?
            simulation = new Simulator(ProcessManager.processes(), ResourceManager.resources());

            // Swap out the buttons.
            $('#stopped-buttons').hide();
            $('#paused-buttons').show();

            // Set the time on the time display.
            $('#time-passed').html("0ms");

            // Show the process progress bars
            $('.progress').show();

            // Hide all the add/delete buttons.
            $('.close').hide();
            $('.btn-add').hide();

            updateState();
        },
        stop: function() {
            simulation = null;
            ProcessManager.resetAll();
            ResourceManager.resetAll();

            // Swap out the buttons.
            $('#stopped-buttons').show();
            $('#paused-buttons').hide();

            // Set the time on the time display.
            $('#time-passed').html("idle");

            // Hide all the process progress bars.
            $('.progress').hide();

            // Show the add/delete buttons
            $('.close').show();
            $('.btn-add').show();
        },
        step: function() {
            updateEarlyState();
            var nextUpdate = simulation.simNextEvent();
            updateLateState();
            if(nextUpdate == 0) {
                $('#time-passed').html("completed (" + simulation.simulatorClock + "ms)");
            }
        },
        stepBack: function() {
            simulation.rollBackToLastSnapshot();
            // Rolling back breaks our references! Which kinda sucks.
            // This fixes it.
            ProcessManager.fixReferences(simulation);
            ResourceManager.fixReferences(simulation);
            
            updateState();
        }
    }
})();
