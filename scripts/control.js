$(function() {
    $('#add-custom-resource').click(ResourceManager.addGeneric);
    $('#add-cpu').click(ResourceManager.addCPU);
    $('#add-custom-process').click(ProcessManager.prompt);
    $('#start-simulation').click(SimulationManager.start);
    $('#step-simulation').click(SimulationManager.step);
    $('#back-simulation').click(SimulationManager.stepBack);
    $('#stop-simulation').click(SimulationManager.stop);
    $(document).keypress(function(e) {
        if(e.which == 110) { // n
            if(!$(this).is("input") && !$(this).is("textarea")) {
                SimulationManager.step();
            }
        }
    });
});

function print(something) {
    if(window.console && console.log) {
        console.log(something);
    }
}
