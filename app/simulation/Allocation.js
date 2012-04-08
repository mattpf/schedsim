Ext.define("SchedSim.simulation.Allocation", {
    quantity: 1,

    constructor: function(resource, duration, process, quantity) {
        this.resource = resource;
        this.duration = duration;
        this.process = process;
        if(quantity !== undefined) {
            this.quantity = quantity;
        }
    }
});
