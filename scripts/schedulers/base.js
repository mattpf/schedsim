"use strict";

/**
 * The base scheduler; all schedulers must implement this interface.
 *
 * @constructor
 */
var Scheduler = function() {
    this.stepSize = 1;
    this.currentProcess = null;
};

/**
 * Schedules a process for execution.
 *
 * @param {Process} proc The process to be scheduled
 */
Scheduler.prototype.addProcess = function(proc) {
    
}

/**
 * Called once per unit time.
 */
Scheduler.prototype.tick = function() {
    
}

/**
 * Returns the current process.
 * @return {Process} The currently executing process, or null if none.
 */
Scheduler.prototype.getProcess = function() {
    return this.currentProcess;
}
