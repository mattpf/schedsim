Ext.define("SchedSim.simulation.Process", {
    statics: {
        nextID: 0,
    },

    arrivalTime: 0,
    progress: 0,
    terminated: false,

    // Metrics
    waitDuration: 0,
    firstProgressTime: -1,
    finishTime: -1,

    constructor: function(needList, arrivalTime, pID) {
        if(needList === undefined) {
            this.needList = [Ext.create("SchedSim.simulation.Need", "CPU", 1000, 0)];
        } else {
            this.needList = needList;
        }

        if(arrivalTime !== undefined) {
            this.arrivalTime = arrivalTime;
        }

        if(pID === undefined) {
            this.pID = this.self.nextID++;
        } else {
            this.pID = pID;
        }
    },

    getWaitDuration: function() {
        return this.waitDuration;
    },

    getFirstProgressTime: function() {
        if(this.firstProgressTime == -1) {
            return "no response";
        }
        return this.firstProgressTime;
    },

    getTurnAroundTime: function() {
        if(this.finishTime == -1) {
            return "not finished";
        }
        return this.finishTime - this.arrivalTime;
    },

    getRunDuration: function() {
        return this.progress;
    },

    getTotalRunDuration: function() {
        var retVal = 0;
        for(var ii in this.needList) {
            var end = this.needList[ii].getEndTime();
            if(end > retVal) {
                retVal = end;
            }
        }
        return retVal;
    },

    isFinished: function() {
        return this.progress >= this.getTotalRunDuration();
    },

    hasTerminated: function() {
        return this.terminated;
    },

    // Returns a list of Need objects; these are the process's internal
    // needs both filtered and offset based on the current progress-time. 
    // * If allocList if given, return any needs still unmet by allocList or [] if none.
    currentNeeds: function(allocList) {
        var retVal = [];
        // If current progress is within the duration of a Need, add it to the list. 
        for (ii in this.needList){
            var need = this.needList[ii];
            if (need.startTime  <= this.progress && this.progress <  need.startTime + need.duration ){
                var stillNeed = need.quantity;
                // Don't return things listed in allocList.  
                if (allocList !== undefined){ 
                    for (jj in allocList){
                        if (allocList[jj].resource === need.resource){
                            stillNeed -= allocList[jj].quantity;
                        }
                    }
                }
                //Don't return things that we're blocking on.  
                for (ii in this.blockWaitingData) {
                    for (jj in this.blockWaitingData[ii]){
                        if (this.blockWaitingData[ii][jj] === need.resource){   
                            stillNeed = 0;
                        }
                    }
                }
                if (stillNeed > 0){ 
                    retVal.push(Ext.create("SchedSim.simluation.Need", need.resource, need.startTime + need.duration - this.progress, -1, stillNeed)); 
                }
            }
        }
        return retVal;
    },

    // This function removes block-waiting status on any resources that are about to stop waiting for. 
    // It returns any resources the process is about to release due to block waiting.  
    notifyUpcomingAllocations: function(allocList, blockWaitingData, outputFlags) {
        // Remove blocking entries if we are about to unblock on them.  
        for (ii in allocList){
            var res = allocList[ii].resource;
            if (this.blockWaitingData[res] !== undefined){
                // We're about to be allocated the thing we were waiting for - so stop blocking.  
                print ("P"+this.pID+": About to get "+res+", so stop blocking on "+this.blockWaitingData[res]+".")
                this.blockWaitingData[res] = undefined; //TODO: What about quantity?!? (we shouldn't often be allocated less of a resource than we requested...but still)
                outputFlags.anyRequest = true;
            }
        }
        // We need to also return any releases...which means we need blockWaitingData passed in.  
        var unmetNeeds = this.currentNeeds(allocList);
        var retVal = [];
        for (ii in unmetNeeds){
            var res = unmetNeeds[ii].resource;
            
            if ( blockWaitingData[res] !== undefined ){
                //We add the indicated resource to our personal blockWaitingData
                print("P"+this.pID+": about to block because it can't get "+res+"!");
                this.blockWaitingData[res] = blockWaitingData[res];
                for(ii in blockWaitingData[res]){
                    var blockRelease = blockWaitingData[res][ii];
                    // Only release what we've actually been allocated.
                    for(jj in allocList){
                        if (allocList[jj].resource === blockRelease)
                        print("P"+this.pID+": Releasing "+blockRelease+". Waiting for "+res+" before requesting it again.");
                        outputFlags.anyRelease = true;
                        retVal.push(blockRelease);
                    }   
                }
            }
            
        }
        return retVal;
    },

    // Returns the amount of progress-time that the process currently
    // needs with the specified resource.
    currentNeed: function(resource) {
        var needs = this.currentNeeds();
        for(ii in needs){
            var need = needs[ii];
            if (need.resource === resource)
                return need.duration;
        }
        return undefined;
    },

    // Returns the progress-time until the next new need arrives in this process.
    timeTillNextEvent: function(allocList) {
        // If allocList not given, assume all needs will be met. 
        var unmetNeeds = (allocList !== undefined) ? this.currentNeeds(allocList) : [];
        
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
    },

    meetNeeds: function(allocList) {
        allocList = allocList !== undefined ? allocList : []; // AllocList defaults to an empty array. 
        blockWaitingData = blockWaitingData !== undefined ? blockWaitingData : []; // blockWaitingData defaults to an empty array. 
        
        //The time parameter is optional. If it's not set, we use the minimum duration in allocList. 
        if (time === undefined){
            time = MAX_INT;
            for(ii in allocList) {
                var alloc = allocList[ii];
                if (alloc.duration < time)
                    time = alloc.duration;
            }
            print ("WARNING:P"+this.pID+": No time specified with allocations! Using the minimum duration in allocList: " + time);
        }
        //print("DEBUG:P"+this.pID+": meetNeeds, allocations="+allocList.length+" time="+time+" blockWaitingData="+blockWaitingData.string+"");
        
        if ( this.hasTerminated() ) { 
            print ("WARNING:P"+this.pID+": This Process has already terminated and doesn't need any more allocations.");
            return allocList; 
        }
    
    
        // Make sure the resources beeing provided are the same as
        // the resources we actually requested to be scheduled.  
        var allNeeds = this.currentNeeds();
        var unmetNeeds = this.currentNeeds(allocList);
        
        var missing = "";
        var retVal = []; // The list of releases that we're going to return
        for(ii in unmetNeeds){ //Only unmet needs will be returned.  
            var res = unmetNeeds[ii].resource;
            missing += res + "   ";
            //print("DEBUG:P"+this.pID+": Missing res="+res+". bwData[res]="+blockWaitingData[res]+".");
            //Check for this resource in the blockWaitingData.  
            if ( blockWaitingData[res] !== undefined && this.blockWaitingData[res] === undefined){
                //We add the indicated resource to our personal blockWaitingData
                this.blockWaitingData[res] = blockWaitingData[res];
                print ("WARNING!!!! P"+this.pID+" adding block for "+res+", because it wasn' set when it should already have been set.");
                for(ii in blockWaitingData[res]){
                    var blockRelease = blockWaitingData[res][ii];
                    // Only release what we've actually been allocated.
                    for(jj in allocList){
                        if (allocList[jj].resource === blockRelease)
                        print("*WARNING: this should already be released* P"+this.pID+": Releasing "+blockRelease+". Waiting for "+res+" before requesting it again.");
                        retVal.push(blockRelease);
                    }   
                }
            }
        }
        if (missing !== ""){
            this.waitDuration += time;
            print("P"+this.pID+":meetNeeds: No progress. Missing resource: " + missing + ". Total time waiting=" + this.waitDuration); 
            retVal.push("BLOCKED");
            return retVal;    
        }
    
    
        //We have all the resources we need. Now determine how much progress is made. 
        // This should usually be "time", but it could be shorter if a new need starts 
        // between (progress) and (progress + time).
        var newProgress = time;     
        if (this.timeTillNextEvent() < time){
            print("WARNING: P"+this.pID+":meetNeeds: New need arriving before time="+time+" Limiting progress to "+this.timeTillNextEvent()+" cycles.");      
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
        for(ii in allNeeds){
            var need = allNeeds[ii];
            //print ("DEBUG: Release check:" + need.string() + "  newProgress=" + newProgress);
            if (need.duration <= newProgress){
                print("P"+this.pID+": releasing "+need.resource+".");
                retVal.push(need.resource);
            }
        }
        //print("DEBUG:meetNeeds. Returning:" + retVal);
        return retVal;
    }
});
