//
// Jan Horjus 
// 2012 
// CS575
//
//

// Constants:
const MAX_INT = 420000000;
const DEFAULT_MAX_HISTORY_SIZE = 50;

// We assume the function "print" is defined globally in the environment. 

// A Close function, used in keeping track of history. 
// May need to be improved.  
function cloneObject(obj) 
{
        var clone = (obj instanceof Array) ? [] : {};
        for(var ii in obj) {
            if(typeof(obj[ii])=="object")
                clone[ii] = cloneObject(obj[ii]);
            else
                clone[ii] = obj[ii];
        }
        return clone;
}

// Class Need
// We define a need as a resource needed (by a process) for a certain duration beginning at a certain starttime.
// A quantity can also be optionally defined.
// Support for needing multiple resources is accomplished by simply having needs overlap in time. 
function Need(resName, duration, startTime, quantity)
{
    //Initial variables:
    this.resName   = resName; // required input.
    this.duration  = duration  !== undefined ? duration  : 1;//duration default is 1.
    this.startTime = startTime !== undefined ? startTime : 0;//startTime default is 0.
    this.quantity  = quantity  !== undefined ? quantity  : 1;//quantity default is 1.(some resources ignore quantity)
    
    //Convenience functions:
    this.getEndTime = function() { return this.startTime + this.duration; }
    
    //Function that returns a string version of the need.
    this.string = function(){
        return "(Res=" + this.resName + " Start=" + this.startTime + 
        " Duration=" + this.duration + " Quantity=" + this.quantity + ")";
    }

//End of Class Need.
}

// Class Request
// The data structure used by processes to communicate their needs to resources.  
// It indicates the pID of the requesting process, the resource being requested and
// the quantity and time the resource is needed for based on the processes current state. 
function Request(pID, resName, duration, quantity)
{
    if (typeof(pID) !== "number"){ print ("ERROR! pID is not number:" + pID); }
    this.pID      = pID;       // not optional. 
    if (typeof(resName) !== "string"){ print ("ERROR! resource is not string:" + resName); }
    this.resName = resName;  // not optional. 
    if (typeof(duration) !== "number"){ print ("ERROR! duration is not number:" + duration); }
    this.duration = duration;  // not optional. 
    this.quantity = quantity  !== undefined ? quantity  : 1;//quantity default is 1.(some resources ignore quantity)

//End of Class Request
}

// Class Allocation
// The mirror of a request - practically identical. It includes the process being allocated 
// to as well as the specific resource, and the quantity and duration of the allocation.
function Allocation(resName, pID, duration, quantity)
{
    //Initial variables:
    if (typeof(resName) !== "string"){ print ("ERROR! resource is not string:" + resName); }
    this.resName = resName;  // not optional. 
    if (typeof(pID) !== "number"){ print ("ERROR! pID is not number:" + pID); }
    this.pID      = pID;       // not optional. 
    if (typeof(duration) !== "number"){ print ("ERROR! duration is not number:" + duration); }
    this.duration = duration;  // not optional. 
    this.quantity = quantity  !== undefined ? quantity  : 1;//quantity default is 1.(some resources ignore quantity)

//End of Class Allocation
}

//function BlockWaitInfoNode(waitFor, beforeRequesting)
//{
//  this.waitFor = waitFor;
//  this.beforeRequesting = beforeRequesting;
//}

// Class Process
function Process(needList, arrivalTime, pID, name)
{ 
    // A static var/function to provide process IDs to new process objects.  
    if (typeof _staticNextId === 'undefined'){ _staticNextId = 0; }
    var nextUniqueID = function() { return _staticNextId++; };
    
    // Assign initial parameters:
    //Core Parameters:
    this.needList    = (needList    !== undefined) ? needList    : [ new Need("CPU",1000,0) ]; // Default is to just need 1000 cycles of CPU. 
    this.arrivalTime = (arrivalTime !== undefined) ? arrivalTime : 0;                          // Default Arrival time is 0. 
    this.pID         = (pID         !== undefined) ? pID         : nextUniqueID();             // pID Default is nextUniqueID. 
    this.progress    = 0; // The process's internal progress meter. Initialize to 0. 
    this.blockWaitingData = {};  // waitFor:beforeRequesting key:value pairs.  
    this.terminated  = false;
    this.name        = (name        !== undefined) ? name        : "Process #" + this.pID;
    
    
    //Metric variables:
    this.waitDuration      = 0;   // Total time spent waiting for resources. 
    this.firstProgressTime = -1;  // The sim-clock time at which the process was first scheduled. 
    this.finishTime          = -1;  // Inidacates the process is finished. Remember to clear if adding new needs.
    
    //Metric functions:
    this.getWaitDuration = function(){ return this.waitDuration; }
    this.getFirstProgressTime = function(){ return (this.firstProgressTime != -1) ? this.firstProgressTime : "no response"; }
    this.getTurnAroundTime = function() { return (this.finishTime != -1 ) ? (this.finishTime - this.arrivalTime) : "not finshed"; }
    this.getRunDuration = function() { return this.progress; }
    this.getTotalRunDuration = function() { 
        var retVal = 0; // Find the max start+duration time among the processes needs.  
        for(var ii in this.needList){ if (this.needList[ii].getEndTime()  > retVal) { retVal = this.needList[ii].getEndTime(); }    }
    return retVal;
    }
    this.isFinished = function () { return this.progress >= this.getTotalRunDuration(); }
    this.hasTerminated = function() { return this.terminated; }  

      
    
    // Returns a list of Request objects; these are the process's internal
    // needs both filtered and offset based on the current progress-time. 
    // * If allocList if given, return any needs still unmet by allocList or [] if none. 
    this.currentRequests = function(allocList)
    {
        var retVal = [];
        // If current progress is within the duration of a Need, add it to the list. 
        for (ii in this.needList){
            var need = this.needList[ii];
            if (need.startTime  <= this.progress && this.progress <  need.startTime + need.duration ){
                var stillNeed = need.quantity;
                // Don't return things listed in allocList.  
                if (allocList !== undefined){ 
                    for (jj in allocList){
                        if (allocList[jj].resName === need.resName){
                            //print ("DEBUG:P"+this.pID+":currentRequests: "+need.resName+" match!")
                            stillNeed -= allocList[jj].quantity;
                        }
                    }
                }
                //Don't return things that we're blocking on.  
                for (ii in this.blockWaitingData) {
                    for (jj in this.blockWaitingData[ii]){
                        //print("DEBUG:P"+this.pID+":currentRequests: ii="+ii+" bwData[ii]="+this.blockWaitingData[ii]+".")
                        if (this.blockWaitingData[ii][jj] === need.resName){    
                            //print ("DEBUG:P"+this.pID+":currentRequests: blockwaiting "+need.resName+" match!")
                            stillNeed = 0;
                        }
                    }
                }
                if (stillNeed > 0){ 
                        retVal.push( new Request(this.pID, need.resName, (need.startTime + need.duration - this.progress), stillNeed) ); 
                }
            }
        }
        //print("DEBUG:P"+this.pID+" currentRequests returning:"+retVal);
        return retVal;
    }
    
    
    // This function removes block-waiting status on any resources that are about to stop waiting for. 
    // It returns any resources the process is about to release due to block waiting.  
    this.notifyUpcomingAllocations = function(allocList, blockWaitingData, outputFlags)
    {
        // Remove blocking entries if we are about to unblock on them.  
        for (ii in allocList){
            var res = allocList[ii].resName;
            if (this.blockWaitingData[res] !== undefined){
                // We're about to be allocated the thing we were waiting for - so stop blocking.  
                print ("P"+this.pID+": About to get "+res+", so stop blocking on "+this.blockWaitingData[res]+".")
                this.blockWaitingData[res] = undefined; //TODO: What about quantity?!? (we shouldn't often be allocated less of a resource than we requested...but still)
                outputFlags.anyRequest = true;
            }
        }
        // We need to also return any releases...which means we need blockWaitingData passed in.  
        var unmetNeeds = this.currentRequests(allocList);
        var retVal = [];
        for (ii in unmetNeeds){
            var res = unmetNeeds[ii].resName;
            
            if ( blockWaitingData[res] !== undefined ){
                //We add the indicated resource to our personal blockWaitingData
                print("P"+this.pID+": about to block because it can't get "+res+"!");
                this.blockWaitingData[res] = blockWaitingData[res];
                for(var ii in blockWaitingData[res]){
                    var blockRelease = blockWaitingData[res][ii];
                    // Only release what we've actually been allocated.
                    for(var jj in allocList){
                        if (allocList[jj].resName === blockRelease)
                        print("P"+this.pID+": Releasing "+blockRelease+". Waiting for "+res+" before requesting it again.");
                        outputFlags.anyRelease = true;
                        retVal.push(blockRelease);
                    }   
                }
            }
            
        }
        
        return retVal;
    }
    
    // Returns the amount of progress-time that the process currently
    // needs with the specified resource.
    this.currentNeed = function(resName)
    {
        var needs = this.currentRequests();
        for(var ii in needs){
            var need = needs[ii];
            if (need.resName === resName)
            {  return need.duration; }
        }
        return undefined;
    }
    
    
    // Returns the progress-time until the next new need arrives in this process.
    this.timeTillNextEvent = function(allocList)
    {
        // If allocList not given, assume all needs will be met. 
        var unmetNeeds = (allocList !== undefined) ? this.currentRequests(allocList) : [];
        
        var retVal = MAX_INT;  
        if (unmetNeeds.length === 0){ // If we have unmet needs we are blocked and won't be causing any new events.
            retVal--; // We decrement by one to allow a MAX_INT return to only occur when a process is blocked.
            for (ii in this.needList){ // If not blocked, the next event is the next incoming request, if any. 
                var need = this.needList[ii];
                if (0 < (need.startTime - this.progress) && (need.startTime - this.progress) < retVal){ 
                    retVal = need.startTime - this.progress; 
                }
            }
        }
        //print("DEBUG:P"+this.pID+": timeTillNextEvent returning "+ retVal +".");
        return retVal;
    }
    
    
    //Returns the amount of progress made by the application with these resources.  
    // (0 if the resources given don't meet the processes current need) 
    this.giveFinalAllocations = function(allocList, time, blockWaitingData)
    {    
        blockWaitingData = blockWaitingData !== undefined ? blockWaitingData : []; // blockWaitingData defaults to an empty array. 
        //The time parameter is optional. If it's not set, we use the minimum duration in allocList. 
        if (time === undefined){
            time = MAX_INT;
            for(var ii in allocList){
                var alloc = allocList[ii];
                if (alloc.duration < time)
                    {  time = alloc.duration; }
            }
        print ("WARNING:P"+this.pID+": No time specified with allocations! Using the minimum duration in allocList: " + time);
        }
        //print("DEBUG:P"+this.pID+": giveFinalAllocations, allocations="+allocList.length+" time="+time+" blockWaitingData="+blockWaitingData.string+"");
        
        if ( this.hasTerminated() ) { 
            print ("WARNING:P"+this.pID+": This Process has already terminated and doesn't need any more allocations.");
            return allocList; 
        }
    
    
        // Make sure the resources beeing provided are the same as
        // the resources we actually requested to be scheduled.  
        var allNeeds = this.currentRequests();
        var unmetNeeds = this.currentRequests(allocList);
        
        //print ("DEBUG:P"+this.pID+" number of unmet needs:" + unmetNeeds.length);
        
        var missing = ""; // Keep track of missing resources in order to report them. 
        var retVal = [];  // The list of releases that we're going to return
        for(var ii in unmetNeeds){ //Only unmet needs will be returned.  
            var res = unmetNeeds[ii].resName;
            missing += res + "   ";
            //print("DEBUG:P"+this.pID+": Missing res="+res+". bwData[res]="+blockWaitingData[res]+".");
            //Check for this resource in the blockWaitingData.  
            if ( blockWaitingData[res] !== undefined && this.blockWaitingData[res] === undefined){
                //We add the indicated resource to our personal blockWaitingData
                this.blockWaitingData[res] = blockWaitingData[res];
                print ("WARNING!!!! P"+this.pID+" adding block for "+res+", because it wasn' set when it should already have been set.");
                for(var ii in blockWaitingData[res]){
                    var blockRelease = blockWaitingData[res][ii];
                    // Only release what we've actually been allocated.
                    for(var jj in allocList){
                        if (allocList[jj].resName === blockRelease)
                        print("*WARNING: this should already be released* P"+this.pID+": Releasing "+blockRelease+". Waiting for "+res+" before requesting it again.");
                        retVal.push(blockRelease);
                    }   
                }
            }
        }
        if (missing !== ""){
            this.waitDuration += time;
            print("P"+this.pID+":giveFinalAllocations: No progress. Missing resource: " + missing + ". Total time waiting=" + this.waitDuration); 
            retVal.push("BLOCKED");
            return retVal;    
        }
    
    
        //We have all the resources we need. Now determine how much progress is made. 
        // This should usually be "time", but it could be shorter if a new need starts 
        // between (progress) and (progress + time).
        var newProgress = time;     
        if (this.timeTillNextEvent() < time){
            print("WARNING: P"+this.pID+":giveFinalAllocations: New need arriving before time="+time+" Limiting progress to "+this.timeTillNextEvent()+" cycles.");   
            newProgress = this.timeTillNextEvent();
        }
    
        //At this point in the function we know we will increment progress since we have all needed resources.
        if (allNeeds.length > 0){
            print("P"+this.pID+": Got all "+allNeeds.length+" needed resources and made "+newProgress+" cycles of progress.");  
        }
        else {
            print("P"+this.pID+": Does not need any resources right now.  Made "+newProgress+" cycles of progress waiting.");   
        }
        
        // Check if we should record firstProgressTime. 
        if (this.progress === 0 && newProgress > 0){
            this.firstProgressTime = this.waitDuration;
        }
        this.progress += newProgress; // Actually Increment progress by newProgress.
        // Check if we should record finishTime.  
        if (this.finishTime === -1 && this.isFinished()){
            this.finishTime = this.progress + this.waitDuration; 
            this.terminated = true;
        }
    
        //Finally check to see if we can release any resources.
        for(var ii in allNeeds){
            var need = allNeeds[ii];
            //print ("DEBUG: Release check:" + need.string() + "  newProgress=" + newProgress);
            if (need.duration <= newProgress){
                print("P"+this.pID+": releasing "+need.resName+".");
                retVal.push(need.resName);
            }
        }
        //print("DEBUG:giveFinalAllocations. Returning:" + retVal);
        return retVal;
    }
    

// End of Class Process
}







// Class Resource
function Resource(name)
{
    this.name = name; // The name is not optional. Every resource needs one.
    this.waitingQueue = [];
    
    // This function sets up a blocking wait relationship between this resource and another resource. 
    // If a process is waiting for this resource it will release blockResource until "this" is aquired. 
    this.blockWaitList = [];
    this.addBlockWaitFor = function(blockResource)   {
        //TODO: Support recieveing a resource object here.  
        print("Resourse "+this.name+": Will block "+blockResource+" while waiting for this resource.");
        this.blockWaitList.push(blockResource); 
    }
    this.getBlockWaitList = function()               { return this.blockWaitList; }

    
    // Return true if the specified process is already waiting for or using this resource.
    this.requestInQueue = function(pID)
    {
        //If input type is a process object instead of pid, get the pid. 
        if (typeof(pID) !== "number"){ 
            print("ERROR! non number input to requestInQueue:"+pID);
            pID = pID.pID;
        }
        //Default is to search this.waitingQueue.
        for (ii in this.waitingQueue){ 
            var procID = this.waitingQueue[ii].pID;
            if (procID === pID){
            return ii;
            }
        }
        return -1;
    }
    
    
    // Call when a process requests a resource.
    // The default addProcess function adds a process to the waiting queue.
    this.addRequests = function(requestList)
    {
        //Default FIFO implementation: just append to the waiting queue (if it's not already there) and return. 
        for(var ii in requestList){ 
            var requestID = requestList[ii].pID;
            var addNewRequest = true;
            //print("DEBUG:"+requestList[ii].string+" "); 
            for (jj in this.waitingQueue){ 
                var queueID = this.waitingQueue[jj].pID;
                if (requestID == queueID){
                    // Update the same position in the waiting queue with the new request. 
                    this.waitingQueue[jj] = requestList[ii];
                    addNewRequest = false ;
                }
            }
            if (addNewRequest){
                print("Resource "+this.name+": Adding P"+requestID+" to waiting queue.");
                this.waitingQueue.push(requestList[ii]); // We remember the request object.
            }
        }
        return undefined; // This function has no return value.  
    }
    
    
    // Call when a process volontarily releases a resource. 
    // The default removeProcess simply removes a process from the waiting queue.
    this.removeRequests = function(processes)
    {
        //Default FIFO implementation: just remove from the waiting queue (if it's there) and return.
        for(var ii in processes){
            var procID = processes[ii].pID;
            var jj = this.requestInQueue(procID); // Find out if process is in list, and if so where. 
            if (jj >= 0){
                print("Resource "+this.name+": Removing P"+procID+" from waiting queue.");
                this.waitingQueue.splice(jj,1); //splice out the element fount at ii. 
            }
        }
        return undefined;
    }   
    
    
    // Return the time until the next forseeable scheduling event on this resource.
    this.timeTillNextEvent = function(activeProcList) //activeProcList is actual procs, not ID numbers. 
    {
        //Default FIFO implementation: return how much more time the currently scheduled process needs, unless
        // the currently scheduled process is blocked, in which case return MAX_INT. 
        if (this.waitingQueue.length > 0){
            for(var ii in activeProcList){
                if (activeProcList[ii] === this.waitingQueue[0].pID){
                    var retVal = this.waitingQueue[0].duration;
                    print("DEBUG:Resource "+this.name+" timeTillNextEvent returning "+ retVal +".")
                    return retVal;
                }
            }
        }
        print("DEBUG:Resource "+this.name+" timeTillNextEvent returning MAX_INT.")
        return MAX_INT;
    }

    
    // Returns a list of the current allocations for this resource.
    // Each allocation indicates a process and details about the resource allocaed.
    this.currentAllocations = function()
    {
        //Default FIFO implementation: 
        if (this.waitingQueue.length > 0){
            // Just allocate however much time the first process in the line wants. 
            var timeToAllocate = this.waitingQueue[0].duration; 
            print("Resource "+this.name+": Allocating "+timeToAllocate+" cycles to P"+this.waitingQueue[0].pID+".");
            return [ new Allocation(this.name, this.waitingQueue[0].pID, timeToAllocate, this.waitingQueue[0].quantity) ];
        }
        return undefined;
    }  

    // Provide a custom renderer!
    // Putting this here violates ~everything. Is that justifiable?
    // ...probably not. "Not my design."
    // colours, if provided, is a mapping from pid to background colour.
    this.render = function(colours) {
        // Default implementation: produce a list of the waiting queue, followed by a list of
        // the block waiting queue?
        console.log(this);
        var html = '';
        var allocations = this.currentAllocations() || [];
        var state = {};
        for(var ii in this.waitingQueue) {
            state[this.waitingQueue[ii].pID] = 'waiting';
        }
        for(var ii in this.blockWaitList) {
            state[this.blockWaitList[ii].pID] = 'blocked';
        }
        for(var ii in allocations) {
            state[allocations[ii].pID] = 'active';
        }
        console.log(state);
        for(var ii in state) {
            if(!state.hasOwnProperty(ii)) continue;
            html += '<li class="' + state[ii] + '" style="background-color:hsl(' +  colours[ii] + ', 75%, 75%)" data-pid="' + ii + '"></li>';
        }
        return html;
    }
    
// End of Class Resource
}






// Class Simulator
function Simulator(processList, resourceList, terminatedProcList, simulatorClock)
{
    // Initial parameters:
    // If we don't specify anything, just throw a few default objects in the lists.
    this.processList        = processList        !== undefined ? processList        : [new Process(), new Process()];
    this.resourceList       = resourceList       !== undefined ? resourceList       : [new Resource("CPU")];
    this.terminatedProcList = terminatedProcList !== undefined ? terminatedProcList : []; // Terminated list starts empty.
    this.simulatorClock     = simulatorClock     !== undefined ? simulatorClock     : 0; // Start the simulator wide clock at 0.

    
    this.historyBuffer = []; // This cannot be specified at creation.  Always empty.
    this.maxHistorySize = DEFAULT_MAX_HISTORY_SIZE; // Max history size starts at a constant, but can be changed after initialization.  
    
    print("Simulator initialized with "+this.processList.length+" processes and "+this.resourceList.length+" resources." );
    
    
    //getProcess - gets a process by ID.  
    this.getProcess = function(pID)
    {
        for (ii in this.processList){
            var proc = this.processList[ii];
            if (proc.pID === pID){
                return proc;
            }
        }
        print("WARNING:Process "+pID+" not found.  ");
        return undefined;
    }
    
    
    //getResource - gets a resource by name.
    this.getResource = function(name)
    {
        //print("DEBUG:getResource: name=" + name + " list=" + this.resourceList);
        for (ii in this.resourceList){
        var res = this.resourceList[ii];
        if (res.name === name){
            return res;
            }
    }
    print("WARNING:Resource "+name+" not found.  ");
    return undefined;
    }
    
    
    // Returns a dictionary of allocations keyed by process ID.  
    this.getCurrentAllocations = function()
    {
        //4.) Get the current allocations from each resource. Accumulate them in lists by process.
        var allocDict = {}; 
        // Start allocDict with an empty list entry for every process (important).  
        for (ii in this.processList){
            allocDict[this.processList[ii].pID] = [];
        }
        // Get current allocations from each resource and push them on the processes lists.
        for (ii in this.resourceList){
            var allocs = this.resourceList[ii].currentAllocations();
            for (jj in allocs){
                allocDict[allocs[jj].pID].push(allocs[jj]);
            }
        }
        return allocDict;
    }
    
    
    // Returns a dictionary of requests keyed by resource name.  
    this.getCurrentRequests = function()
    { // Go through each process, ask it it's current requests. Accumulate them by resource.
        var requestDict = {}; 
        for (ii in this.processList){ 
            var proc = this.processList[ii];
            var requests = proc.currentRequests();
            for (jj in requests ){ 
                var res = requests[jj].resName;
                if (requestDict[res] === undefined){
                    requestDict[res] = [ requests[jj] ];
                } else { // If we already have resources for this process, add this one to the list. 
                    requestDict[res].push( requests[jj] );
                }
            }
        }
        return requestDict;
    }
    
    
    // Records a snapshot of the current state onto the historyBuffer. 
    // The snapshot is also a Simulator object. Snapshots do not have history, however. 
    this.recordHistorySnapshot = function()
    {
        var snapshot = new Simulator(            // We create a new Simulator:
                cloneObject(this.processList),       // New processList is a close of current one. 
                cloneObject(this.resourceList),      // New resourceList is a close of current one. 
                cloneObject(this.terminatedProcList),// New terminatedProcList is a close of current one. 
                this.simulatorClock);                // Keep the same simulatorClock. 
        // Push this new snapshop onto the history list.  
        this.historyBuffer.push(snapshot);
        // Make sure the history buffer doesn't get too big. 
        if (this.historyBuffer.length > this.maxHistorySize){
            this.historyBuffer.shift();
            print("DEBUG:maxHistorySize reached:"+this.historyBuffer.length+".");
        }
    }
    
    
    // Reverts to the state in the last saved snapshot in the historyBuffer.
    // 
    this.rollBackToLastSnapshot = function()
    {
        // Make sure history is not empty.
        if (this.historyBuffer.length === 0){
            print("INFO: Cannot return to last snapshot: History is empty.");
            return;
        }
        // Pop the last snapshot off of the historyBuffer.
      var lastSnapshot = this.historyBuffer.pop();
        if (lastSnapshot instanceof Simulator){
            print("Turning back the clock from "+this.simulatorClock+" to "+lastSnapshot.simulatorClock+".");
            // Overwrite the important data members in this object with the ones from the snapshot one at a time. No cloning! 
            this.processList        = lastSnapshot.processList;
            this.resourceList       = lastSnapshot.resourceList;
            this.terminatedProcList = lastSnapshot.terminatedProcList;          
            this.simulatorClock     = lastSnapshot.simulatorClock;
        } else {
            print("ERROR! Something other than a snapshot found in historyBuffer. type="+typeof(lastSnapshot)+".");
        }
    }
    
    
    // The big function that moves time forward to the next event.
    this.simNextEvent = function()
    {
        print("Simulator: Enter simNextEvent.");
        //0.) Record a history snapshot.
        this.recordHistorySnapshot();
    
        //1.) Get the Blockwaiting data for the whole system. 
        var blockWaitData = {}; // This should just be a simulator-wide constant!  There should be a function to grab it from the resources!
        for(var ii in this.resourceList){
            var res = this.resourceList[ii];
            // Does the resource we are about to wait for cause another resource to be released?
            var bwData = res.getBlockWaitList();
            if (bwData.length > 0){
                // Put the blockWaitingData in the dictionary. {Key:"wait for" Value:"before requesting"}
                blockWaitData[res.name] = bwData;
            }
        }
    
        //2.) Go through each process, ask it it's current needs. Accumulate them by resource.
        var needDict = this.getCurrentRequests();
        //3.) Distribute needs to resources.  
        for (ii in needDict) {
            var res = this.getResource(ii);
            if (res !== undefined) { res.addRequests(needDict[ii]); }
            else { print ("ERROR! A cannot find requested resource \""+ii+"\" in this simulation."); }
        }
        //4.) Get the current allocations from each resource. Accumulate them in lists by process.
        var allocDict = this.getCurrentAllocations();
    
        //5.) Distribute allocations to processes, to let them know what they are about to be allocated.   
        //( so they can release about-to-be-blocked resources and request blocked resources that are about to be unblocked  )
        // We then accumulate any releases.  
        var releaseDict = {};
        var outputFlags = {anyRelease:false, anyRequest:false};
        for (ii in this.processList) {
            var proc = this.processList[ii];
            var releases = proc.notifyUpcomingAllocations(allocDict[proc.pID], blockWaitData, outputFlags); 
            for (jj in releases){
                var resName = releases[jj];
                //If this is the first release for this resource, then create the list entry for its name.
                if (releaseDict[resName] === undefined){
                    releaseDict[resName] = [ proc ];
                } else { // If we already have resources for this process, add this one to the list. 
                    releaseDict[resName].push(proc);
                }
            }
        }
        
        if (outputFlags.anyRequest === true || outputFlags.anyRelease === true){
            //6.) Distribute releases to resources.  
            for (ii in this.resourceList){
                var res = this.resourceList[ii];
                if(releaseDict[res.name] !== undefined){
                    res.removeRequests(releaseDict[res.name]);
                    //print("DEBUG: Release Successful. P" + releaseDict[res.name][0].pID+" released "+res.name+"."  );
                }
            }
            // Now we repeat steps 2-4.  
            //2 again.) Go through each process, ask it it's current needs. Accumulate them by resource.
            var needDict = this.getCurrentRequests();
            //3 again.) Distribute needs to resources.  
            for (ii in needDict) {
                var res = this.getResource(ii);
                if (res !== undefined) { res.addRequests(needDict[ii]); }
                else { print ("ERROR! A cannot find requested resource \""+ii+"\" in this simulation."); }
            }
            //4 again.) Refresh our allocations to take account of the releases.  
            var allocDict = this.getCurrentAllocations();
        } else {
            print ("Simulator: No extra releases or requests due to block-waiting.");
        }
        
        //8.) Now find the time till the next event. We check both the process
        // and resource lists for the shortest timeTillNextEvent. 
        var nextEventTime = MAX_INT;
        var activeProcList = [];
        for (ii in this.processList){ //First check processList
            var proc = this.processList[ii];
            // We pass the final allocations to the process so it won't indicate any next event if its about to be blocked.  
            var time = proc.timeTillNextEvent(allocDict[proc.pID]);
            if (time < nextEventTime){ // Keep track of the shortest time reported from. 
                nextEventTime = time;
            }
            if (time !== MAX_INT){ // If process is not blocked, add to active list. 
                activeProcList.push(proc.pID);
            }
        }
        //Now check resourceList:
        for (ii in this.resourceList){ 
            // We pass activeProcList to each resource, so the resources can be informed about whether the processes 
            // they've allocated to are making progress. If a resource is allocated to a blocked process it will not 
            // be released and will not cause an event unless the allocation is revoked or preempted. 
            var time = this.resourceList[ii].timeTillNextEvent(activeProcList);
            if (time < nextEventTime){
                nextEventTime = time;
            }
        }
        if (nextEventTime === MAX_INT){
            print ("Simulator: No more events found! This simulation is over!");
            return 0;
        }
    
        print("Simulator: Time till next event is " + nextEventTime + ".");
        
        //9.) Now we have all the allocations in lists by pID.  Send them out to the processes!
        // The processes will return lists of resources to release.  
        var releaseDict = {};
        var processesWithAllocations = 0;
        for (var ii=0; ii < this.processList.length; ii++){
            var proc = this.processList[ii];
            processesWithAllocations++;
            //Call giveFinalAllocations: we pass in allocations and get out names of resources to be released.
            var releases = proc.giveFinalAllocations(allocDict[proc.pID], nextEventTime, blockWaitData);
            //Put the releases in buckets by resource name, just like we did with allocations by pID.
            for(var jj in releases){
                var release = releases[jj];
                //print("DEBUG:P"+proc.pID+" released "+release+".");
                if (releaseDict[release] === undefined){
                    releaseDict[release] = [ proc ];
                } else {
                    releaseDict[release].push(proc);
                }
            }
            //Finally, check if the process has terminated:
            if (proc.hasTerminated()){
                print("Simulator: P"+proc.pID+" has terminated.  Moving to terminated process list.");
                this.terminatedProcList.push(proc); // Add to terminated list.
                this.processList.splice(ii,1);       // Remove from the active list. 
                ii--; //Must decrement ii to avoid skipping a process.
            }
        }
    
        //10.) Now we have all the releases in lists by resource name.  Send them out to the resources!
        var anyRelease = false;
        for (ii in this.resourceList){
            var res = this.resourceList[ii];
            if(releaseDict[res.name] !== undefined){
                res.removeRequests(releaseDict[res.name]);
                anyRelease = true;
            }
        }
        
        //11.) Check for deadlock - giveFinalAllocations returns special ID "BLOCKED" if it can't make progress. 
        // If all processes with resources are blocked, then we may be in a deadlock.  
        if (!anyRelease && releaseDict["BLOCKED"] !== undefined && releaseDict["BLOCKED"].length === processesWithAllocations){
            print("Simulator: No allocated process can make any progress!  Simulation ends in deadlock!!");
            print("For now, return 0 to terminate simulation. When we have resources with preemption this will change.");
            return 0;
        }

        this.simulatorClock += nextEventTime; // Start the simulator wide clock at 0.
        print("Simulator: Exit simNextEvent. time passed="+nextEventTime+" Clock="+this.simulatorClock+".");
        
        return nextEventTime;
    }
    
//End of Class Simulator
}

