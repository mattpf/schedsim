"use strict";

var RoundRobinScheduler = function(quantum) {
    this.queue = [];
    this.currentProcessTicks = 0;
    this.quantum = quantum;
    this.queuePointer = null;
};

RoundRobinScheduler.prototype = new Scheduler();

RoundRobinScheduler.prototype.addProcess = function(proc) {
    if($.inArray(proc, this.queue) != -1)
        return;

    proc.scheduler = this;
    this.queue.push(proc);
    if(this.queuePointer === null) {
        this.runNextProcess();
    }
}

RoundRobinScheduler.prototype.tick = function() {
    if(this.isComplete()) {
        return;
    }
    if(this.currentProcess && this.currentProcess.isComplete()) {
        console.log("Process completed.");
        this.removeProcess(this.currentProcess);
    } else {
        if(++this.currentProcessTicks >= this.quantum) {
            this.runNextProcess();
        } else {
            this.currentProcess.tick();
        }
    }
}

RoundRobinScheduler.prototype.removeProcess = function(proc) {
    // Optimisation and special handling for removing the current process.
    if(proc === this.currentProcess) {
        console.log("Removing current process.");
        this.queue.splice(this.queuePointer--, 1);
        this.runNextProcess();
        return;
    }

    var pos = $.inArray(proc, this.queue);
    if(pos != -1) {
        this.queue.splice(pos, 1);
    }
}

RoundRobinScheduler.prototype.runNextProcess = function() {
    if(++this.queuePointer >= this.queue.length) {
        this.queuePointer = 0;
    }
    console.log("Moving to next process.");
    this.currentProcessTicks = 0;
    if(this.queue[this.queuePointer]) {
        this.currentProcess = this.queue[this.queuePointer];
    } else {
        this.currentProcess = null;
    }
}

RoundRobinScheduler.prototype.isComplete = function() {
    return !this.queue.length;
}
