import type { GeneratedTask } from "../types";
import type { Rng } from "../rng";
import { makeTask } from "./helpers";

/**
 * Rapid-fire pre-flight system checks. Each is a genuine engineering
 * verification whose numbers come from the rocket's systems — the bare sum
 * is never shown to the child.
 */
export function generateChecklist(rng: Rng, count = 5): GeneratedTask[] {
  const makers: ((r: Rng) => GeneratedTask)[] = [
    (r) => {
      const chips = r.int(4, 9);
      const boards = r.int(4, 9);
      return makeTask({
        criterionCode: "4NF-1",
        rocketPart: "electronics",
        tier: 2,
        briefing: `GUIDANCE COMPUTER — the flight computer needs ${chips} backup chips loaded onto each of its ${boards} circuit boards. How many chips do we need in total?`,
        engineeringContext: "Backup chips take over instantly if a main chip fails in flight.",
        answer: String(chips * boards),
        workedSteps: [`${boards} boards, each taking ${chips} chips.`, `That is ${chips * boards} chips.`],
        hints: [`Count ${chips} for each board.`],
        visual: { widget: "checklist", config: { system: "guidance" } },
        rocketEffect: { property: "circuitsWired", correctValue: 1, incorrectValue: 0, unit: "" },
      });
    },
    (r) => {
      const per = r.int(4, 9);
      const compartments = r.int(4, 8);
      const total = per * compartments;
      return makeTask({
        criterionCode: "3MD-1",
        rocketPart: "payloadBay",
        tier: 2,
        briefing: `LIFE SUPPORT — the crew capsule carries ${total} oxygen canisters, shared equally across its ${compartments} storage compartments. How many canisters per compartment?`,
        engineeringContext: "Even sharing means every compartment lasts the same number of hours.",
        answer: String(per),
        workedSteps: [`Share ${total} into ${compartments} equal groups.`, `Each compartment holds ${per}.`],
        hints: [`What number taken ${compartments} times makes ${total}?`],
        visual: { widget: "checklist", config: { system: "lifeSupport" } },
        rocketEffect: { property: "payloadPods", correctValue: compartments, incorrectValue: compartments - 1, unit: "" },
      });
    },
    (r) => {
      const a = r.int(11, 29);
      const b = r.int(11, 39);
      return makeTask({
        criterionCode: "3NF-1",
        rocketPart: "electronics",
        tier: 2,
        briefing: `COMMUNICATIONS — antenna A draws ${a} watts and antenna B draws ${b} watts. What is the total power draw for the comms system?`,
        engineeringContext: "The comms budget line on the power sheet must show the true total.",
        answer: String(a + b),
        workedSteps: [`Combine ${a} and ${b}.`, `The total is ${a + b} watts.`],
        hints: ["Add the tens first, then the ones."],
        visual: { widget: "checklist", config: { system: "comms" } },
        rocketEffect: { property: "powerBalanced", correctValue: 1, incorrectValue: 0, unit: "" },
      });
    },
    (r) => {
      const used = r.int(21, 79);
      return makeTask({
        criterionCode: "3AS-1",
        rocketPart: "electronics",
        tier: 2,
        briefing: `POWER SYSTEMS — the solar panels generate exactly 100 watts. Engine pre-heating is using ${used} watts of it. How much power is left for the other systems?`,
        engineeringContext: "Every remaining system must fit inside the spare watts.",
        answer: String(100 - used),
        workedSteps: [`${used} of the 100 watts are used.`, `That leaves ${100 - used} watts.`],
        hints: [`${used} and what make 100?`],
        visual: { widget: "checklist", config: { system: "power" } },
        rocketEffect: { property: "powerBalanced", correctValue: 1, incorrectValue: 0, unit: "" },
      });
    },
    (r) => {
      const sats = r.int(4, 9);
      const secs = r.int(4, 9);
      return makeTask({
        criterionCode: "4NF-1",
        rocketPart: "electronics",
        tier: 2,
        briefing: `NAVIGATION — we must ping ${sats} satellites to fix our position, and each ping takes ${secs} seconds. How long until the position fix is complete?`,
        engineeringContext: "The countdown holds until the position fix comes back.",
        answer: String(sats * secs),
        workedSteps: [`${sats} pings of ${secs} seconds each.`, `The fix takes ${sats * secs} seconds.`],
        hints: [`Count in ${secs}s, once per satellite.`],
        visual: { widget: "checklist", config: { system: "navigation" } },
        rocketEffect: { property: "circuitsWired", correctValue: 1, incorrectValue: 0, unit: "" },
      });
    },
    (r) => {
      const tanks = r.int(2, 4);
      const per = r.pick([25, 50, 40]);
      return makeTask({
        criterionCode: "3NF-2",
        rocketPart: "fuelTank",
        tier: 2,
        briefing: `FUEL PRESSURE — each of the ${tanks} tanks needs ${per} pump strokes to reach launch pressure. How many strokes will the pressurising pump make in total?`,
        engineeringContext: "The pump's counter must land exactly on this number.",
        answer: String(tanks * per),
        workedSteps: [`${tanks} tanks of ${per} strokes.`, `That is ${tanks * per} strokes.`],
        hints: [`Count in ${per}s.`],
        visual: { widget: "checklist", config: { system: "fuel" } },
        rocketEffect: { property: "tankFill", correctValue: 0.8, incorrectValue: 0.6, unit: "" },
      });
    },
  ];
  return rng.shuffle(makers).slice(0, count).map((m) => m(rng));
}