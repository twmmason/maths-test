/**
 * Cached commander (player) name, set when the active profile loads.
 * Kept dependency-free so AI modules can use it without touching the DB.
 */
let commanderName = "Commander";

export function setCommanderName(name: string): void {
  commanderName = (name || "Commander").replace(/^Commander\s+/i, "").trim() || "Commander";
}

export function getCommanderName(): string {
  return commanderName;
}