//********** Begin Resource Classes: RR_Cpu, Request, Allocation **********//

// Class RoundRobinCPU - a flexible round-robin CPU resource with configurable quantum and number of cores.
function RoundRobinCPU(name, quantum, cores)
{ 
    // We inherit from the Resource class. This is also where we pass values into the parent class constructor!
    // this.prototype = new Resource(name);  <-- This line must be included after the full definition of the class. Here for referance.
    Resource.call(this, name); // A javascript trick that allows you to call the parent class's constructor (since you normally don't get to).  
    
    // No we have our own constructor code:
    this.quantum = quantum !== undefined ? quantum : 100; // Default quantum is 100.
    this.cores   = cores   !== undefined ? cores   : 1;   // Default number of cores is 1.
    this.quantumsUsed = {}; // Will be populated by (pID:timeChargedToCurrentQuantum) key:value pairs.  Since the keys are all numbers we use []. (memory or performance risk??)
    
    // Now the main functions that every resource has to overwrite: currentAllocations and notifyResourceClock.  
    this.notifyResourceClock = function(timePassed)
    {
        // Round Robin needs to decrement the remaining current quantum for every current allocation. 
        allocs = this.currentAllocations();
        if (allocs !== undefined && allocs.length > 0){
            for(var ii in allocs){
                var procID = allocs[ii].pID;
                // If no entry of time charged to a quantum for this pID exists, create it. Otherwise increment it.
                if (this.quantumsUsed[procID] !== undefined){
                    this.quantumsUsed[procID] += timePassed;
                }
                else{
                    this.quantumsUsed[procID] = timePassed;
                }
                // If the process has reached the end of its quantum, move it to the back of the queue, and delete its charge entry.
                if (this.quantumsUsed[procID] === this.quantum){
                    var pos = this.requestInQueue(procID);
                    var request = this.waitingQueue.splice(pos,1); // Splice should return the removed object...
                    this.waitingQueue.push(request[0]);            // So that it can be pushed back on the end of the array.
                    delete this.quantumsUsed[procID];
                    print("DEBUG:P"+procID+" used up it's quantum on resource "+this.name+". Moved to back of queue.");
                }
                else if (this.quantumsUsed[procID] > this.quantum){
                    print("***ERROR! Somehow P"+procID+" exceeded its quantum!");
                }
            }
        }
        
        // The second thing we need to do is prune the quantumsUsed list of any entries for processes that are no 
        // longer in the waitingQueue.  
        for(ii in this.quantumsUsed){
            if (this.requestInQueue(parseInt(ii)) === -1){
                delete this.quantumsUsed[ii];
                print("DEBUG:P"+procID+"'s quantum charge entry pruned from "+this.name+". It must have released the resource voluntarily.");
            }
        }
        
        //Don't need to increment the resourceClock in a inherited class.  
    }
    
    this.currentAllocations = function()
    {
        // We return a number of allocations up to the number of cores configured or the number of outstanding requests.  
        retVal = [];
        for (var ii = 0; ii < this.cores && ii < this.waitingQueue.length; ii++){
            // We return those allocations to the processes at the front of the queue. 
            // The length of each allocation is equal to the remaining quantum for the process or the time requested - whichever is smaller. 
            var quantumAlreadyUsed = this.quantumsUsed[this.waitingQueue[ii].pID] !== undefined ? this.quantumsUsed[this.waitingQueue[ii].pID] : 0;
            var timeTillPreemption = this.quantum - quantumAlreadyUsed
            var timeToAllocate;
            if (timeTillPreemption < this.waitingQueue[ii].duration){
                // The "process runs out of quantum" case. 
                timeToAllocate = timeTillPreemption;
            } else {
                // The "process doesn't need a whole quantum" case. 
                timeToAllocate = this.waitingQueue[ii].duration;
            }
            retVal.push( new Allocation(this.name, 
                    this.waitingQueue[ii].pID, 
                    timeToAllocate, 
                    this.waitingQueue[ii].quantity,  //TODO: Actually respect quantity! 
                    timeTillPreemption) ); // This is a pre-emptive resource.  
            print("RRCPU \""+this.name+"\" allocating "+timeToAllocate+" cycles to P"+this.waitingQueue[ii].pID+".")
        }
    
        return retVal;
    }
    RoundRobinCPU.prototype = new Resource();
    //End of Class Simulator
}

// Add the round-robin CPU to the UI:

$(function() {
    ResourceManager.addType('RRCPU', 'Round Robin CPU', 'CPU', RoundRobinCPU, [
        {name: 'Quantum', value: '50', unit: 'ms', help: 'Maximum period to run one process before switching', numeric: true},
        {name: 'Cores', value: '1', help: 'Numer of processes to execute simultaneously', numeric: true}
    ]);
});
