Resources = {};

Resources.RoundRobin = function(quantum) {this.quantum = quantum; this.elapsed = 0; this.pointer = null;};
Resources.RoundRobin.prototype = Resource;
Resources.RoundRobin.prototype.timeTillNextEvent = function(activeProcList) {
    if(this.pointer == null) {
        return MAX_INT;
    }

    for(var ii in activeProcList){
        if (activeProcList[ii] === this.waitingQueue[this.pointer].pID){
            var retVal = this.waitingQueue[this.pointer].duration;
            print("DEBUG:Resource "+this.name+" timeTillNextEvent returning "+ retVal +".")
            return retVal;
        }
    }
    return MAX_INT;
}