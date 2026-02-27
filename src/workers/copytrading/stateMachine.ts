import type { CopyTradingState } from "./types";

export class CopyTradingStateMachine {
  private state: CopyTradingState = "stopped";
  private error: string | null = null;

  get current(): CopyTradingState {
    return this.state;
  }

  get lastError(): string | null {
    return this.error;
  }

  start(): void {
    if (this.state === "running") {
      return;
    }
    this.transition("running");
  }

  pause(): void {
    if (this.state !== "running") {
      return;
    }
    this.transition("paused");
  }

  resume(): void {
    if (this.state !== "paused") {
      return;
    }
    this.transition("running");
  }

  stop(): void {
    this.error = null;
    this.transition("stopped");
  }

  fail(message: string): void {
    this.error = message;
    this.transition("error");
  }

  recover(): void {
    if (this.state !== "error") {
      return;
    }
    this.error = null;
    this.transition("paused");
  }

  private transition(next: CopyTradingState): void {
    this.state = next;
  }
}
