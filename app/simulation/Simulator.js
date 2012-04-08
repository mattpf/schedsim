Ext.define('SchedSim.simulation.Simulator', {
    simulatorClock: 0,

    constructor: function(processList, resourceList) {
        if(processList === undefined) {
            this.processList = [Ext.create('SchedSim.simulator.Process'), Ext.create('SchedSim.simulator.Process')];
        } else {
            this.processList = processList;
        }

        if(resourceList === undefined) {
            this.resourceList = [Ext.create('SchedSim.simulator.Resource', 'CPU')];
        } else {
            this.resourceList = resourceList;
        }

        this.terminatedProcessList = [];

        print("Simulator initialized with "+this.processList.length+" processes and "+this.resourceList.length+" resources." );
    },

    //getProcess - gets a process by ID.  
    getProcess: function(pID) {
        for (ii in this.processList){
            var proc = this.processList[ii];
            if (proc.pID === pID){
                return proc;
            }
        }
        print("WARNING:Process "+pID+" not found.  ");
        return undefined;
    },

    getResource: function(name) {
        for (ii in this.resourceList){
            var res = this.resourceList[ii];
            if (res.name === name){
                return res;
            }
        }
        print("WARNING:Resource "+name+" not found.  ");
        return undefined;
    },

    // Returns a dictionary of allocations keyed by process ID.  
    getCurrentAllocations: function(name) {
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
                allocDict[allocs[jj].process.pID].push(allocs[jj]);
            }
        }
        return allocDict;
    },

    // Returns a dictionary of requests keyed by resource name.  
    getCurrentRequests: function() {
        // Go through each process, ask it it's current needs. Accumulate them by resource.
        var needDict = {}; 
        for (ii in this.processList){ 
            var proc = this.processList[ii];
            var needs = proc.currentNeeds();
            for (jj in needs ){ 
                var res = needs[jj].resource;
                if (needDict[res] === undefined){
                    needDict[res] = [ proc ];
                } else { // If we already have resources for this process, add this one to the list. 
                    needDict[res].push( proc );
                }
            }
        }
        return needDict;
    },

    // The big function that moves time forward to the next event.
    simNextEvent: function() {
        print("Simulator: Enter simNextEvent.");

        //1.) Get the Blockwaiting data for the whole system. 
        var blockWaitData = {}; // This should just be a simulator-wide constant!  There should be a function to grab it from the resources!
        for(ii in this.resourceList){
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
            if (res !== undefined) { res.addProcesses(needDict[ii]); }
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
                    res.removeProcesses(releaseDict[res.name]);
                    //print("DEBUG: Release Successful. P" + releaseDict[res.name][0].pID+" released "+res.name+"."  );
                }
            }
            // Now we repeat steps 2-4.  
            //2 again.) Go through each process, ask it it's current needs. Accumulate them by resource.
            var needDict = this.getCurrentRequests();
            //3 again.) Distribute needs to resources.  
            for (ii in needDict) {
                var res = this.getResource(ii);
                if (res !== undefined) { res.addProcesses(needDict[ii]); }
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
                activeProcList.push(proc);
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
        //Call meetNeeds: we pass in allocations and get out names of resources to be released.
        var releases = proc.meetNeeds(allocDict[proc.pID], nextEventTime, blockWaitData);
            //Put the releases in buckets by resource name, just like we did with allocations by pID.
            for(jj in releases){
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
                this.terminatedProcessList.push(proc); // Add to terminated list.
                this.processList.splice(ii,1);       // Remove from the active list. 
                ii--; //Must decrement ii to avoid skipping a process.
            }
        }
    
        //10.) Now we have all the releases in lists by resource name.  Send them out to the resources!
        var anyRelease = false;
        for (ii in this.resourceList){
            var res = this.resourceList[ii];
            if(releaseDict[res.name] !== undefined){
                res.removeProcesses(releaseDict[res.name]);
                anyRelease = true;
            }
        }
        
        //11.) Check for deadlock - meetNeeds returns special ID "BLOCKED" if it can't make progress. 
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
});
