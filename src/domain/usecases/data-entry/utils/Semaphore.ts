export class Semaphore {
    private tasks: (() => Promise<void>)[] = [];
    private activeCount = 0;
    private maxConcurrent: number;

    constructor(maxConcurrent: number) {
        this.maxConcurrent = maxConcurrent;
    }

    async acquire(): Promise<void> {
        if (this.activeCount < this.maxConcurrent) {
            
            this.activeCount++;
            //console.debug("Semaphore acquire succeed activeCount: ", this.activeCount);
            return;
        } else {
            // If max concurrency reached, queue the task
            //console.debug("Semaphore acquire too many threads, activeCount: ", this.activeCount);
            await new Promise<void>((resolve) => {
                this.tasks.push(async () => {
                    // Increment activeCount when this queued task starts running (from release)
                    this.activeCount++;
                    resolve();
                });
            });
        }
    }

    public getActiveCount(): number {
        return this.activeCount;
    }

    public getTasks() {
        return this.tasks;
    }

    release(): void {
        if (this.activeCount > 0) {
            // Decrement activeCount when a task completes
            this.activeCount--;
            //console.debug("Semaphore release activeCount: ", this.activeCount);
        }

        if (this.tasks.length > 0) {
            // Dequeue the next task and allow it to proceed
            
            const nextTask = this.tasks.shift();
            //console.debug("Semaphore release taking next task count: ", this.tasks.length);
            if (nextTask) {
                nextTask(); // Start the next task
            }
        }
    }
}
