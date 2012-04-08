Ext.define('SchedSim.simulation.Resource', {
    constructor: function(name) {
        this.name = name;
        this.waitingQueue = [];
        this.blockWaitingList = [];
    },

    addBlockWaitFor: function(blockResource) {
        //TODO: Support recieveing a resource object here.  
        print("Resourse "+this.name+": Will block "+blockResource+" while waiting for this resource.");
        this.blockWaitList.push(blockResource); 
    },

    getBlockWaitList: function() {
        return this.blockWaitList;
    },

    // Return true if the specified process is already waiting for or using this resource.
    processInQueue: function(process) {
        //Default is to search this.waitingQueue.
        for (ii in this.waitingQueue){ 
            var proc = this.waitingQueue[ii];
            if (proc === process){
            return ii;
            }
        }
        return -1;
    },

    // Call when a process requests a resource.
    // The default addProcess function adds a process to the waiting queue.
    addProcess: function(processList) {
        //Default FIFO implementation: just append to the waiting queue (if it's not already there) and return. 
        for(ii in processList){ 
            var proc = processList[ii];
            //print("DEBUG:"+proc.string+" "); 
            if (this.processInQueue(proc) < 0){
                print("Resource "+this.name+": Adding P"+proc.pID+" to waiting queue.");
                this.waitingQueue.push(proc);
            }
        }
        return undefined;
    },

    // Call when a process volontarily releases a resource. 
    // The default removeProcess simply removes a process from the waiting queue.
    removeProcess: function(processes) {
        //Default FIFO implementation: just remove from the waiting queue (if it's there) and return.
        for(ii in processes){
            var process = processes[ii];
            var jj = this.processInQueue(process); // Find out if process is in list, and if so where. 
            if (jj >= 0){
                print("Resource "+this.name+": Removing P"+process.pID+" from waiting queue.");
                this.waitingQueue.splice(jj,1); //splice out the element fount at ii. 
            }
        }
        return undefined;
    },

    // Return the time until the next forseeable scheduling event on this resource.
    timeTillNextEvent: function(activeProcList) {
        //Default FIFO implementation: return how much more time the currently scheduled process needs, unless
        // the currently scheduled process is blocked, in which case return MAX_INT. 
        if (this.waitingQueue.length > 0){
            for(ii in activeProcList){
                if (activeProcList[ii] === this.waitingQueue[0]){
                    var retVal = this.waitingQueue[0].currentNeed(this.name);
                    //print("DEBUG:Resource "+this.name+" timeTillNextEvent returning "+ retVal +".")
                    return retVal;
                }
            }
        }
        print("DEBUG:Resource "+this.name+" timeTillNextEvent returning MAX_INT.")
        return MAX_INT;
    },

    // Returns a list of the current allocations for this resource.
    // Each allocation indicates a process and details about the resource allocaed.
    currentAllocations: function() {        //Default FIFO implementation: 
        if (this.waitingQueue.length > 0){
            // Just allocate however much time the first process in the line wants. 
            var timeToAllocate = this.waitingQueue[0].currentNeed(this.name); 
            print("Resource "+this.name+": Allocating "+timeToAllocate+" cycles to P"+this.waitingQueue[0].pID+".");
            return [ Ext.create('SchedSim.simulation.Allocation', this.name, timeToAllocate, this.waitingQueue[0]) ];
        }
        return undefined;
    }
});
