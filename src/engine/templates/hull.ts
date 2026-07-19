import type { GeneratedTask } from "../types";
import type { Rng } from "../rng";
import { makeTask, mc, nearBy, fmt, numberToWords, roundTo, digitName } from "./helpers";

type Gen = (rng: Rng, tier: 1 | 2 | 3) => GeneratedTask;

const heightEffect = (correct: number, incorrect: number) => ({
  property: "hullHeight",
  correctValue: correct,
  incorrectValue: incorrect,
  unit: "m",
});
const panelEffect = (correct: number) => ({
  property: "hullPanels",
  correctValue: correct,
  incorrectValue: Math.max(4, Math.round(correct * 0.6)),
  unit: "panels",
});

export const hullTemplates: Record<string, Gen> = {
  "1NPV-1": (rng, tier) => {
    const max = tier === 1 ? 20 : tier === 2 ? 60 : 99;
    const n = rng.int(3, max - 1);
    const back = tier === 3 && rng.next() < 0.5;
    const ans = back ? n - 1 : n + 1;
    return makeTask({
      criterionCode: "1NPV-1",
      rocketPart: "hull",
      tier,
      briefing: back
        ? `The crane is unbolting hull panels one at a time, counting down. It has just lifted off panel number ${n}. Which panel number comes off next?`
        : `The workshop robot is fitting numbered hull panels in order. It has just fitted panel number ${n}. Which panel number does it fit next?`,
      engineeringContext: "The panels must go on in strict number order so the seams line up.",
      answer: String(ans),
      choices: tier === 1 ? mc(rng, String(ans), nearBy(rng, ans, 2)) : undefined,
      workedSteps: [`Counting ${back ? "backwards" : "forwards"} from ${n}, the next number is ${ans}.`],
      hints: [back ? "Count back one from the last panel." : "Count on one from the last panel.", `Say the numbers out loud around ${n}.`],
      visual: { widget: "ruler", config: { mode: "panels", current: n } },
      rocketEffect: panelEffect(Math.min(ans + 10, 60)),
    });
  },

  "2NPV-1": (rng, tier) => {
    const n = rng.int(21, 99);
    const askTens = rng.next() < 0.5;
    const ans = askTens ? Math.floor(n / 10) : n % 10;
    return makeTask({
      criterionCode: "2NPV-1",
      rocketPart: "hull",
      tier,
      briefing: `The hull ring measures ${n} cm across. The blueprint printer needs the digit in the ${askTens ? "tens" : "ones"} place of that measurement. Which digit is it?`,
      engineeringContext: "Each digit of the measurement goes into its own box on the blueprint.",
      answer: String(ans),
      choices: tier === 1 ? mc(rng, String(ans), nearBy(rng, ans, 3)) : undefined,
      workedSteps: [
        `${n} is made of ${Math.floor(n / 10)} tens and ${n % 10} ones.`,
        `The ${askTens ? "tens" : "ones"} digit is ${ans}.`,
      ],
      hints: ["The tens digit is the first digit; the ones digit is the last.", `Break ${n} into tens and ones.`],
      visual: { widget: "ruler", config: { mode: "length", value: n, max: 100 } },
      rocketEffect: heightEffect(6, 5),
    });
  },

  "3NPV-1": (rng, tier) => {
    const hundreds = tier === 1 ? 1 : rng.int(2, tier === 2 ? 4 : 9);
    const total = hundreds * 100;
    return makeTask({
      criterionCode: "3NPV-1",
      rocketPart: "hull",
      tier,
      briefing: `Hull panels arrive in crates of 10. The build order calls for ${fmt(total)} panels in total. How many crates of 10 do we need to order?`,
      engineeringContext: "Ordering the right number of crates means the build never stops to wait for parts.",
      answer: String(total / 10),
      choices: tier === 1 ? mc(rng, String(total / 10), [String(total), String(total / 10 + 1), String(hundreds)]) : undefined,
      workedSteps: [
        `10 crates of 10 panels make 100 panels.`,
        `${fmt(total)} panels is ${hundreds} hundreds, so we need ${total / 10} crates.`,
      ],
      hints: ["How many tens make one hundred?", `Think of ${fmt(total)} as ${hundreds} groups of one hundred.`],
      visual: { widget: "ruler", config: { mode: "panels", current: total } },
      rocketEffect: panelEffect(48),
    });
  },

  "3NPV-2": (rng, tier) => {
    const n = rng.int(101, 987);
    const places = [100, 10, 1] as const;
    const place = tier === 1 ? 10 : rng.pick(places);
    const digit = Math.floor(n / place) % 10;
    const value = digit * place;
    return makeTask({
      criterionCode: "3NPV-2",
      rocketPart: "hull",
      tier,
      briefing: `The finished hull is ${n} cm long. The stress computer reads the measurement one place at a time and has reached the ${digitName(place)} place. What is the VALUE of the digit in the ${digitName(place)} place?`,
      engineeringContext: "The stress computer adds up each place value to check the hull length.",
      answer: String(value),
      choices: tier < 3 ? mc(rng, String(value), [String(digit), String(digit * place * 10), String(Math.max(0, value - place))]) : undefined,
      workedSteps: [
        `${n} is ${Math.floor(n / 100)} hundreds, ${Math.floor(n / 10) % 10} tens and ${n % 10} ones.`,
        `The digit ${digit} in the ${digitName(place)} place is worth ${value}.`,
      ],
      hints: [`Find the digit sitting in the ${digitName(place)} column first.`, "A digit's value depends on its place, not just what it looks like."],
      visual: { widget: "ruler", config: { mode: "length", value: n, max: 1000 } },
      rocketEffect: heightEffect(6.5, 5.5),
    });
  },

  "3NPV-3": (rng, tier) => {
    const max = 1000;
    const step = tier === 1 ? 100 : tier === 2 ? 50 : 25;
    const value = rng.int(1, max / step - 1) * step;
    return makeTask({
      criterionCode: "3NPV-3",
      rocketPart: "hull",
      tier,
      briefing: `The hull section measures ${value} cm. Slide the marker to show ${value} on the workshop measuring line, which runs from 0 to ${fmt(max)} cm.`,
      engineeringContext: "Marking the length on the master line tells the crane where to grip.",
      answer: String(value),
      workedSteps: [
        `The line runs 0 to ${fmt(max)}, so halfway is ${max / 2}.`,
        `${value} sits ${value < max / 2 ? "before" : value > max / 2 ? "after" : "exactly at"} the halfway mark.`,
      ],
      hints: [`Find the halfway point (${max / 2}) first.`, `Count along in steps of ${step}.`],
      visual: { widget: "numberLine", config: { min: 0, max, step, target: value, interactive: true, unit: "cm" } },
      rocketEffect: heightEffect(6, 5),
      tolerance: max * 0.02,
    });
  },

  "3NPV-4": (rng, tier) => {
    const mark = rng.int(1, 9);
    const per = tier === 3 ? 50 : 100;
    const ans = mark * per;
    return makeTask({
      criterionCode: "3NPV-4",
      rocketPart: "hull",
      tier,
      briefing: `The hull mass gauge runs from 0 to ${fmt(per * 10)} kg with a mark every ${per} kg. The needle is resting on mark number ${mark}. How many kilograms is the hull section?`,
      engineeringContext: "The crane operator sets the lifting power from this gauge reading.",
      answer: String(ans),
      choices: tier === 1 ? mc(rng, String(ans), [String(mark), String(ans + per), String(Math.max(0, ans - per))]) : undefined,
      workedSteps: [`Each mark is worth ${per} kg.`, `Mark ${mark} means ${mark} lots of ${per}, which is ${fmt(ans)} kg.`],
      hints: [`Count up in ${per}s, one for each mark.`, "Multiply the mark number by the value of one mark."],
      visual: { widget: "numberLine", config: { min: 0, max: per * 10, step: per, pointer: ans, readOnly: true, unit: "kg" } },
      rocketEffect: heightEffect(6, 5.2),
    });
  },

  "4NPV-1": (rng, tier) => {
    const n = rng.int(1001, 9876);
    const place = rng.pick([1000, 100, 10] as const);
    const digit = Math.floor(n / place) % 10;
    const value = digit * place;
    return makeTask({
      criterionCode: "4NPV-1",
      rocketPart: "hull",
      tier,
      briefing: `The completed hull weighs ${fmt(n)} kg. Mission Control's manifest highlights the digit ${digit} in that weight. What is that digit actually worth?`,
      engineeringContext: "The manifest splits the weight into thousands, hundreds, tens and ones for the fuel calculation.",
      answer: String(value),
      choices: tier < 3 ? mc(rng, String(value), [String(digit), String(value * 10), String(value / 10 || digit)]) : undefined,
      workedSteps: [
        `${fmt(n)} has ${Math.floor(n / 1000)} thousands, ${Math.floor(n / 100) % 10} hundreds, ${Math.floor(n / 10) % 10} tens and ${n % 10} ones.`,
        `The digit ${digit} sits in the ${digitName(place)} place, so it is worth ${fmt(value)}.`,
      ],
      hints: ["Which column is the digit sitting in?", "Multiply the digit by the value of its column."],
      visual: { widget: "ruler", config: { mode: "mass", value: n, max: 10000 } },
      rocketEffect: heightEffect(6.5, 5.5),
    });
  },

  "4NPV-2": (rng, tier) => {
    const th = rng.int(1, 9);
    const h = rng.int(0, 9);
    const t = rng.int(0, 9);
    const o = tier === 1 ? 0 : rng.int(0, 9);
    const total = th * 1000 + h * 100 + t * 10 + o;
    return makeTask({
      criterionCode: "4NPV-2",
      rocketPart: "hull",
      tier,
      briefing: `The hull build used ${th} thousand-kilogram beams, ${h} hundred-kilogram plates, ${t} ten-kilogram struts and ${o} one-kilogram bolts. The manifest needs the total mass in kilograms. What is it?`,
      engineeringContext: "The total build mass feeds straight into the thrust calculation.",
      answer: String(total),
      workedSteps: [
        `${th} thousands makes ${fmt(th * 1000)}; ${h} hundreds makes ${h * 100}; ${t} tens makes ${t * 10}; and ${o} ones.`,
        `Together that composes ${fmt(total)} kg.`,
      ],
      hints: ["Write each part in its place-value column.", "Thousands first, then hundreds, tens and ones."],
      visual: { widget: "ruler", config: { mode: "mass", value: total, max: 10000 } },
      rocketEffect: heightEffect(6.5, 5.5),
    });
  },

  "4NPV-4": (rng, tier) => {
    const nearest = tier === 1 ? 10 : tier === 2 ? 100 : 1000;
    const n = rng.int(1200, 9800) + rng.int(1, 9);
    const ans = roundTo(n, nearest);
    return makeTask({
      criterionCode: "4NPV-4",
      rocketPart: "hull",
      tier,
      briefing: `The scales read the hull mass as ${fmt(n)} kg. Mission Control's quick-look screen only shows masses rounded to the nearest ${fmt(nearest)} kg. What number should the screen show?`,
      engineeringContext: "Rounded figures let Mission Control check the mass budget at a glance.",
      answer: String(ans),
      choices: tier === 1 ? mc(rng, String(ans), [String(ans + nearest), String(Math.max(0, ans - nearest)), String(n)]) : undefined,
      workedSteps: [
        `Look at the digit to the right of the ${digitName(nearest / 10)} place... if it is 5 or more, round up.`,
        `${fmt(n)} rounds to ${fmt(ans)}.`,
      ],
      hints: [`Find the two multiples of ${fmt(nearest)} either side of ${fmt(n)}.`, "Which one is it closer to?"],
      visual: { widget: "numberLine", config: { min: ans - nearest, max: ans + nearest, step: nearest / 10, pointer: n, readOnly: true, unit: "kg" } },
      rocketEffect: heightEffect(6.5, 5.8),
    });
  },

  "5NPV-1": (rng, tier) => {
    const factor = tier === 1 ? 10 : tier === 2 ? 100 : 1000;
    const base = rng.int(2, 9) + rng.int(1, 9) / 10;
    const ans = Math.round(base * factor * 100) / 100;
    return makeTask({
      criterionCode: "5NPV-1",
      rocketPart: "hull",
      tier,
      briefing: `The blueprint drawing shows the hull ${base} m tall, but the drawing is a scale model: the real hull is ${fmt(factor)} times as tall. How tall is the real hull in metres?`,
      engineeringContext: "Scaling the blueprint up correctly means every real part fits the drawing.",
      answer: String(ans),
      workedSteps: [
        `Making a number ${fmt(factor)} times bigger moves every digit ${String(factor).length - 1} place${factor > 10 ? "s" : ""} to the left.`,
        `${base} scaled by ${fmt(factor)} is ${fmt(ans)}.`,
      ],
      hints: ["Move the digits, not the decimal point — each digit slides up the place-value columns.", `Try ${base} scaled by 10 first, then keep going.`],
      visual: { widget: "ruler", config: { mode: "length", value: ans, max: ans * 1.5 } },
      rocketEffect: heightEffect(7, 5.5),
    });
  },

  "5NPV-2": (rng, tier) => {
    const whole = rng.int(1, 9);
    const tenths = rng.int(1, 9);
    const hundredths = tier === 1 ? 0 : rng.int(1, 9);
    const n = whole + tenths / 10 + hundredths / 100;
    const askTenths = tier === 1 ? true : rng.next() < 0.5;
    const digit = askTenths ? tenths : hundredths;
    const value = askTenths ? tenths / 10 : hundredths / 100;
    return makeTask({
      criterionCode: "5NPV-2",
      rocketPart: "hull",
      tier,
      briefing: `The laser measure reads the hull diameter as ${n.toFixed(hundredths ? 2 : 1)} m. The digit ${digit} sits just ${askTenths ? "one place" : "two places"} after the decimal point. What is that digit worth, in metres?`,
      engineeringContext: "Decimal precision decides whether the payload bay slots inside the hull.",
      answer: String(value),
      choices: tier < 3 ? mc(rng, String(value), [String(digit), String(value * 10), String(value / 10)]) : undefined,
      workedSteps: [
        `The first place after the point is tenths; the second is hundredths.`,
        `So the digit ${digit} is worth ${value} m.`,
      ],
      hints: ["Tenths come first after the decimal point, then hundredths.", `One tenth of a metre is 0.1 m.`],
      visual: { widget: "ruler", config: { mode: "length", value: n, max: 12 } },
      rocketEffect: heightEffect(6.5, 6),
    });
  },

  "5NPV-4": (rng, tier) => {
    const whole = rng.int(1, 8);
    const t = rng.int(1, 9);
    const h = rng.pick([1, 2, 3, 4, 6, 7, 8, 9]);
    const n = whole + t / 10 + h / 100;
    const toWhole = tier === 3 && rng.next() < 0.5;
    const ans = toWhole ? Math.round(n) : Math.round(n * 10) / 10;
    return makeTask({
      criterionCode: "5NPV-4",
      rocketPart: "hull",
      tier,
      briefing: `The precision laser reads the hull diameter as ${n.toFixed(2)} m. The parts catalogue lists diameters ${toWhole ? "to the nearest whole metre" : "to one decimal place"}. What diameter should we look up?`,
      engineeringContext: "Catalogue parts only come in standard rounded sizes.",
      answer: toWhole ? String(ans) : ans.toFixed(1),
      choices: tier === 1 ? mc(rng, ans.toFixed(1), [(ans + 0.1).toFixed(1), (Math.max(0, ans - 0.1)).toFixed(1), n.toFixed(2)]) : undefined,
      workedSteps: [
        `Look at the ${toWhole ? "tenths" : "hundredths"} digit: it is ${toWhole ? t : h}.`,
        `${toWhole ? t : h} ${((toWhole ? t : h) >= 5) ? "is 5 or more, so round up" : "is less than 5, so keep the digit the same"}: ${n.toFixed(2)} becomes ${toWhole ? ans : ans.toFixed(1)}.`,
      ],
      hints: ["Check the digit one place beyond where you are rounding to.", "5 or more rounds up; 4 or less stays."],
      visual: { widget: "ruler", config: { mode: "length", value: n, max: 12 } },
      rocketEffect: heightEffect(6.5, 6),
    });
  },

  "6NPV-1": (rng, tier) => {
    const n =
      tier === 1 ? rng.int(1, 9) * 100000 + rng.int(0, 9) * 10000
      : tier === 2 ? rng.int(1, 9) * 1000000 + rng.int(0, 9) * 100000
      : rng.int(1, 9) * 1000000 + rng.int(1, 999) * 1000;
    const answer = numberToWords(n);
    const wrong1 = numberToWords(n + (tier === 1 ? 10000 : 100000));
    const wrong2 = numberToWords(Math.max(1000, n - (tier === 1 ? 100000 : 1000000)));
    const wrong3 = numberToWords(Math.floor(n / 10));
    return makeTask({
      criterionCode: "6NPV-1",
      rocketPart: "hull",
      tier,
      briefing: `The finance office says this hull costs £${fmt(n)} to build. The cheque has to show the amount written out in words. Which wording is correct?`,
      engineeringContext: "The bank only accepts the cheque if the words match the digits exactly.",
      answer,
      choices: mc(rng, answer, [wrong1, wrong2, wrong3]),
      workedSteps: [
        `Split ${fmt(n)} at the commas: millions, thousands, then the rest.`,
        `Read each group, then say its column name: "${answer}".`,
      ],
      hints: ["The commas split the number into millions, thousands and ones groups.", "Read each three-digit group like a small number, then add the group name."],
      visual: { widget: "numberLine", config: { min: 0, max: 10000000, step: 1000000, pointer: n, readOnly: true, unit: "£" } },
      rocketEffect: heightEffect(7, 6),
    });
  },

  "6NPV-2": (rng, tier) => {
    const factor = tier === 1 ? 100 : 1000;
    const small = rng.int(2, 9) * (tier === 3 ? 10 : 1);
    const ans = small * factor;
    return makeTask({
      criterionCode: "6NPV-2",
      rocketPart: "hull",
      tier,
      briefing: `One support strut weighs ${fmt(small)} kg. The finished hull frame weighs ${fmt(factor)} times as much as one strut. What does the frame weigh in kilograms?`,
      engineeringContext: "The launch pad's load sensors must be set to the frame's full weight.",
      answer: String(ans),
      workedSteps: [
        `Scaling by ${fmt(factor)} moves every digit ${String(factor).length - 1} places left.`,
        `${fmt(small)} scaled by ${fmt(factor)} is ${fmt(ans)}.`,
      ],
      hints: ["Scaling by 10 adds one place; keep going for each extra zero.", `Start with ${fmt(small)} scaled by 10.`],
      visual: { widget: "ruler", config: { mode: "mass", value: ans, max: ans * 1.2 } },
      rocketEffect: heightEffect(7, 6),
    });
  },

  "6NPV-4": (rng, tier) => {
    const base = rng.int(1, 4);
    const tenth = tier === 1 ? rng.pick([2, 4, 5, 6, 8]) : rng.int(1, 9);
    const value = base + tenth / 10 + (tier === 3 ? rng.pick([0.05, 0.25, 0.75]) / 10 : 0);
    const rounded = Math.round(value * 100) / 100;
    return makeTask({
      criterionCode: "6NPV-4",
      rocketPart: "hull",
      tier,
      briefing: `The hull pressure gauge runs from 0 to 5 bar, with a labelled mark every 0.1 bar. Read where the needle is pointing and type the pressure in bar.`,
      engineeringContext: "The pressure reading proves the hull is sealed before fuelling begins.",
      answer: String(rounded),
      workedSteps: [
        "Find the labelled marks either side of the needle.",
        `The needle sits at ${rounded} bar.`,
      ],
      hints: ["Each small step on this gauge is one tenth.", "Read the whole number first, then count the tenths."],
      visual: { widget: "numberLine", config: { min: 0, max: 5, step: 0.1, pointer: rounded, readOnly: true, unit: "bar" } },
      rocketEffect: heightEffect(6.8, 6.2),
      tolerance: 0.05,
    });
  },
};