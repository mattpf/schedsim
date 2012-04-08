Ext.define("SchedSim.simulation.Need", {
    resource: null,
    duration: 1,
    startTime: 0,
    quantity: 1,

    constructor: function(resource, duration, startTime, quantity) {
        this.resource = resource;
        if(duration !== undefined) {
            this.duration = duration
        }
        if(startTime !== undefined) {
            this.startTime = startTime;
        }
        if(quantity !== undefined) {
            this.quantity = quantity;
        }
    },

    getEndTime: function() {
        return this.startTime + this.duration;
    },

    string: function() {
        return "(Res=" + this.resource + " Start=" + this.startTime + 
        " Duration=" + this.duration + " Quantity=" + this.quantity + ")";
    }
});
