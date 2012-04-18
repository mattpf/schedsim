SimulationManager = (function() {
    var simluation = null;

    function updateState() {
        $('#time-passed').html(simulation.simulatorClock + "ms");

        $.each(ProcessManager.processes(), function(index, value) {
            $('#p' + value.pID).find('.bar').css('width', ((value.getRunDuration() / value.getTotalRunDuration()) * 100) + '%')
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

            // Hide all the delete buttons.
            $('.close').hide();
        },
        stop: function() {
            // I have no idea what I'm supposed to do with the other two paramaters...?
            simulation = null;

            // Swap out the buttons.
            $('#stopped-buttons').show();
            $('#paused-buttons').hide();

            // Set the time on the time display.
            $('#time-passed').html("idle");

            // Hide all the process progress bars.
            $('.progress').hide();

            // Show the delete buttons
            $('.close').show();
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
