"use strict";

var FirstComeFirstServedScheduler = function() {
    this.queue = [];
};

FirstComeFirstServedScheduler.prototype = new Scheduler();

FirstComeFirstServedScheduler.prototype.addProcess = function(proc) {
    if($.inArray(proc, this.queue) != -1)
        return;

    proc.scheduler = this;
    this.queue.push(proc);
    if(this.queue.length === 1) {
        this.currentProcess = proc;
    }
}

FirstComeFirstServedScheduler.prototype.tick = function() {
    if(this.isComplete()) {
        return;
    }
    if(this.currentProcess && this.currentProcess.isComplete()) {
        console.log("Process completed.");
        this.nextProcess();
    } else {
        this.currentProcess.tick();
    }
}

FirstComeFirstServedScheduler.prototype.nextProcess = function() {
    this.queue.splice(0, 1);
    if(this.queue.length) {
        this.currentProcess = this.queue[0];
    } else {
        this.currentProcess = null;
    }
}

FirstComeFirstServedScheduler.prototype.isComplete = function() {
    return !this.queue.length;
}
