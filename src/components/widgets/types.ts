import type { GeneratedTask } from "../../engine/types";

export interface WidgetProps {
  task: GeneratedTask;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}

export function cfgNum(task: GeneratedTask, key: string, fallback = 0): number {
  const v = task.visual.config[key];
  return typeof v === "number" ? v : fallback;
}

export function cfgBool(task: GeneratedTask, key: string): boolean {
  return task.visual.config[key] === true;
}

export function cfgStr(task: GeneratedTask, key: string, fallback = ""): string {
  const v = task.visual.config[key];
  return typeof v === "string" ? v : fallback;
}