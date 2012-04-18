SimulationManager = (function() {
    var simluation = null;
    var colours = {};

    function updateState() {
        // Update the time display
        $('#time-passed').html(simulation.simulatorClock + "ms");

        // Update the progress bars in the process list
        $.each(ProcessManager.processes(), function() {
            $('#p' + this.pID).find('.bar').css('width', ((this.getRunDuration() / this.getTotalRunDuration()) * 100) + '%')
        });

        // Generate the collection of processes. Each processes has a single colour value associated with it.
        // We then stick it into hsl(n, 100%, 75%) for something that's hopefully aesthetically pleasing.
        $('#simulation-process-boxes').html('');
        $.each(ProcessManager.processes(), function() {
            if(colours[this.pID] === undefined) {
                colours[this.pID] = Math.random() * 360;
            }
            $('#simulation-process-boxes').append('<div data-pid="'+this.pID+'" class="state-box process" style="background-color: hsl('+colours[this.pID]+', 75%, 75%)">' + this.name + '</div>');
            if(this.hasTerminated()) {
                $('#simulation-process-boxes > div[data-pid=' + this.pID + ']').addClass('terminated');
            }
        });
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
            var nextUpdate = simulation.simNextEvent();
            updateState();
            if(nextUpdate == 0) {
                $('#time-passed').html("completed (" + simulation.simulatorClock + "ms)");
            }
        },
        stepBack: function() {
            simulation.rollBackToLastSnapshot();
            // Rolling back breaks our references! Which kinda sucks.
            // This fixes it.
            ProcessManager.fixReferences(simulation);
            
            updateState();
        }
    }
})();
