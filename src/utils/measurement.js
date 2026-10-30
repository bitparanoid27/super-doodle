// External modules here

// Internal modules here

export class Counter {
    constructor(title) {
        this.mode = title;
        this.status = "running";
        this.startedAt = null;
        this.endedAt = null;
        this.startMark = null;
        this.elapsedTimeMS = null;

        this.counts = 0;
        this.matches = 0;
        this.inputBytes = null;
        this.outputBytes = null;
        this.memoryReadings = [];
        this.peakMemory = null;
    }

    start() {
        this.startedAt = new Date();
        this.startMark = performance.now();
    }

    stop() {
        this.endedAt = new Date();
        this.elapsedTimeMS = performance.now() - this.startMark;
        this.peakMemory = process.resourceUsage().maxRSS;
    }

    countRow() {
        this.counts = this.counts + 1;
    }

    countMatch() {
        this.matches = this.matches + 1;
    }

    reading(label) {
        this.memoryReadings.push({ label, ...process.memoryUsage() });
    }
}
