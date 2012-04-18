$(function() {
    $('#add-custom-resource').click(ResourceManager.prompt);
    $('#add-custom-process').click(ProcessManager.prompt);
    $('#add-cpu').click(ResourceManager.addCPU);
    $('#start-simulation').click(SimulationManager.start);
    $('#step-simulation').click(SimulationManager.step);
    $('#back-simulation').click(SimulationManager.stepBack);
    $('#stop-simulation').click(SimulationManager.stop);
});

function print(something) {
    if(window.console && console.log) {
        console.log(something);
    }
}
