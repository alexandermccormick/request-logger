import { EOL, ensureFile } from "fs/mod.ts";
import { readLines } from "io/mod.ts";
import type { Entry } from "./Entry.ts";

type Task = () => Promise<unknown>;

class TaskQueue {
  private queue: Array<Task> = [];
  private isRunning = false;
  onStop?: (() => void) | (() => Promise<void>);

  get length() { return this.queue.length }

  add(item: Task) {
    this.queue.push(item);
    
    if (!this.isRunning) {
      this.isRunning = true;
      this.run();
    }
  }

  private async run() {
    const task = this.queue.shift();
    if (task) {
      await task();

      if (this.length) {
        await this.run();
      } else {
        this.isRunning = false;
        if (this.onStop !== undefined) {
          this.onStop();
        }
      }
    }
  }
}

export class Logger {
  private logFile: FileHandle;
  private taskRunner = new TaskQueue();

  constructor(logFilePath: string) {
    this.logFile = new FileHandle(logFilePath);
    this.taskRunner.onStop = () => this.logFile.close();
  }

  logEntry(entry: Entry) {
    this.taskRunner.add(async () => {
      const logEntry = `${ JSON.stringify(entry) }${ EOL.LF }`;
      await this.logFile.append(logEntry);
    });
  }

  readLines(lineRange: [number, number]): Promise<Array<string>> {
    return new Promise<Array<string>>((resolve) => {
      this.taskRunner.add(async () => {
        resolve(await this.logFile.readLines(lineRange));
      });
    });
  }
}

interface FileHandleState {
  isOpen: boolean;
  mode: null | "read" | "append";
}

type FileHandleStatus = "open" | "closed";

export class FileHandle {
  private handle: Deno.FsFile | undefined;
  private path: string;
  private state: FileHandleState = {
    isOpen: false,
    mode: null,
  };

  constructor(path: string) {
    this.path = path;
  }

  get isOpen() { return this.state.isOpen }

  async append(data: string) {
    await this.assertState("open")
      .then(async () => {
        if (this.state.mode !== "append") {
          await this.close();
          throw undefined;
        }
      })
      .catch(async () => {
        await this.openAppend();
      })
      .finally(async () => {
        const encoder = new TextEncoder();
        await this.handle!.write(encoder.encode(data));
      });
  }

  async openAppend() {
    await this.assertState("closed")
      .catch(async () => await this.close())
      .finally(async () => await this.open({ append: true }));
  }

  async openRead() {
    await this.assertState("closed")
      .catch(async () => await this.close())
      .finally(async () => await this.open({ read: true }));
  }

  async readLines(lineRange: [number, number]): Promise<Array<string>> {
    await this.assertState("open")
      .then(async () => {
        if (this.state.mode !== "read") {
          await this.close();
          throw undefined;
        }
      })
      .catch(async () => {
        await this.openRead();
      });

    const [start, end] = lineRange;
    const lines: Array<string> = [];

    if (end === -1) {
      for await (const line of readLines(this.handle!)) {
        lines.push(line);
        if (lines.length > start) {
          lines.shift();
        }
      }
    } else {
      const limit = end - start;
      console.log(limit)
      let iteration = 0;

      if (limit < 1) {
        return lines;
      }

      for await (const line of readLines(this.handle!)) {
        if (iteration < start) {
          console.log("not collecting")
          iteration++;
          continue;
        }

        iteration++;

        lines.push(line);

        console.log(iteration, end)
        if (iteration === end) {
          break;
        }
      }

    }
    return lines;
  }

  async close() {
    await this.assertState("open")
      .catch(() => {
        this.invalidStateError("open");
        console.warn("FileHandle with be reset");
      })
      .finally(() => {
        this.handle?.close();
        this.handle = undefined;
        this.state.isOpen = false;
        this.state.mode = null;
      });
  }

  private assertState(state: FileHandleStatus): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      let validState = false;

      switch(state) {
        case "open":
          validState = (this.handle instanceof Deno.FsFile) && this.isOpen;
          break;

        case "closed":
          validState = (this.handle === undefined) && !this.isOpen
          break;
      }

      validState ? resolve(validState) : reject(validState);
    });
  }

  private async open( options: Deno.OpenOptions) {
    this.assertState("closed")
    await ensureFile(this.path);

    this.handle = await Deno.open(this.path, options)
      .catch(error => { throw new Error("Failed to open log file:", error) });

    this.state.isOpen = true;
    this.state.mode = Object.keys(options).includes("append") ? "append" : "read";
  }

  private invalidStateError(expectedStatus: FileHandleStatus) {
    const status = this.state.isOpen ? "open" : "closed";
    console.error(
      `FileHandler for "${ this.path }" was found in an invalid state:",
      "Expected "${ expectedStatus }" state, but found ${ status }`,
      this.state
    );
  }
}
