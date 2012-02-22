"use strict";

/**
 * Represents a process.
 *
 * @constructor
 */
var Process = function(pid, length) {
    this.pid = pid;
    this.needed = length;
    this.passed = 0;
}

/**
 * Advances the process simulation one tick.
 */
Process.prototype.tick = function() {
    ++this.passed;
}

/**
 * Returns whether the process is complete.
 * @return {bool} True if complete, false otherwise.
 */
Process.prototype.isComplete = function() {
    return (this.passed >= this.needed)
}
