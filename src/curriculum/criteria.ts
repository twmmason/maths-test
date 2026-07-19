import type { Criterion } from "./types";

/**
 * The 81 DfE Ready-to-Progress criteria (Years 1–6), each mapped to the
 * rocket part whose engineering tasks certify it.
 */
export const CRITERIA: Criterion[] = [
  // ── NPV — Number & Place Value (21) ────────────────────────────────────
  { code: "1NPV-1", strand: "NPV", year: 1, part: "hull", description: "Count within 100, forwards and backwards, starting with any number" },
  { code: "1NPV-2", strand: "NPV", year: 1, part: "fuelTank", description: "Reason about the location of numbers to 20 within the linear number system" },
  { code: "2NPV-1", strand: "NPV", year: 2, part: "hull", description: "Recognise the place value of each digit in two-digit numbers; compose and decompose" },
  { code: "2NPV-2", strand: "NPV", year: 2, part: "fuelTank", description: "Reason about the location of two-digit numbers; identify previous and next multiple of 10" },
  { code: "2NPV-3", strand: "NPV", year: 2, part: "fuelTank", description: "Count in multiples of 10; read scales marked in tens" },
  { code: "3NPV-1", strand: "NPV", year: 3, part: "hull", description: "Know that 10 tens are equivalent to 1 hundred; understand 100s, 10s and 1s in 3-digit numbers" },
  { code: "3NPV-2", strand: "NPV", year: 3, part: "hull", description: "Recognise the place value of each digit in three-digit numbers" },
  { code: "3NPV-3", strand: "NPV", year: 3, part: "hull", description: "Reason about the location of three-digit numbers in the linear number system (number lines)" },
  { code: "3NPV-4", strand: "NPV", year: 3, part: "hull", description: "Read scales and number lines marked in multiples of 100 with equal parts" },
  { code: "4NPV-1", strand: "NPV", year: 4, part: "hull", description: "Understand the relationship between 1,000s, 100s, 10s and 1s; value of each digit" },
  { code: "4NPV-2", strand: "NPV", year: 4, part: "hull", description: "Recognise the composition of four-digit numbers" },
  { code: "4NPV-3", strand: "NPV", year: 4, part: "fuelTank", description: "Reason about the location of four-digit numbers; read scales in multiples of 1,000" },
  { code: "4NPV-4", strand: "NPV", year: 4, part: "hull", description: "Round numbers to the nearest 10, 100 or 1,000" },
  { code: "5NPV-1", strand: "NPV", year: 5, part: "hull", description: "Multiply and divide by 10, 100 and 1,000 (powers of 10)" },
  { code: "5NPV-2", strand: "NPV", year: 5, part: "hull", description: "Recognise the place value of decimals with tenths and hundredths" },
  { code: "5NPV-3", strand: "NPV", year: 5, part: "fuelTank", description: "Reason about the location of numbers on scaled number lines and gauges" },
  { code: "5NPV-4", strand: "NPV", year: 5, part: "hull", description: "Round decimals to the nearest whole number or one decimal place" },
  { code: "6NPV-1", strand: "NPV", year: 6, part: "hull", description: "Read, write and understand numbers up to 10,000,000, including in words" },
  { code: "6NPV-2", strand: "NPV", year: 6, part: "hull", description: "Understand the relationship between powers of 10 up to 10 million" },
  { code: "6NPV-3", strand: "NPV", year: 6, part: "fuelTank", description: "Understand decimal place value to thousandths; convert decimals and fractions" },
  { code: "6NPV-4", strand: "NPV", year: 6, part: "hull", description: "Read scales and number lines with labelled decimal intervals" },

  // ── NF — Number Facts (11) ─────────────────────────────────────────────
  { code: "1NF-1", strand: "NF", year: 1, part: "engine", description: "Fluently add and subtract within 10 (number bonds)" },
  { code: "1NF-2", strand: "NF", year: 1, part: "engine", description: "Count forwards and backwards in multiples of 2, 5 and 10" },
  { code: "2NF-1", strand: "NF", year: 2, part: "engine", description: "Secure fluency in addition and subtraction facts within 20" },
  { code: "3NF-1", strand: "NF", year: 3, part: "engine", description: "Secure fluency in addition and subtraction facts across 10" },
  { code: "3NF-2", strand: "NF", year: 3, part: "engine", description: "Recall multiplication and division facts for the 10, 5, 2, 4 and 8 tables" },
  { code: "3NF-3", strand: "NF", year: 3, part: "engine", description: "Apply place-value knowledge to known number facts (scaling facts by 10)" },
  { code: "4NF-1", strand: "NF", year: 4, part: "engine", description: "Recall multiplication and division facts up to 12 times 12" },
  { code: "4NF-2", strand: "NF", year: 4, part: "engine", description: "Solve division problems with two-digit dividends that involve remainders" },
  { code: "4NF-3", strand: "NF", year: 4, part: "engine", description: "Apply place-value knowledge to known number facts (scaling facts by 100)" },
  { code: "5NF-1", strand: "NF", year: 5, part: "engine", description: "Secure fluency in multiplication table facts; recognise primes and composites" },
  { code: "5NF-2", strand: "NF", year: 5, part: "engine", description: "Apply number facts scaled by one tenth or one hundredth" },

  // ── AS — Addition & Subtraction (9) ────────────────────────────────────
  { code: "1AS-1", strand: "AS", year: 1, part: "fins", description: "Compose numbers to 10 from two parts; partition into parts" },
  { code: "1AS-2", strand: "AS", year: 1, part: "electronics", description: "Read, write and interpret additive number sentences" },
  { code: "2AS-1", strand: "AS", year: 2, part: "fins", description: "Add and subtract across 10 and within 100" },
  { code: "2AS-2", strand: "AS", year: 2, part: "electronics", description: "Recognise the subtraction structure of difference" },
  { code: "2AS-3", strand: "AS", year: 2, part: "electronics", description: "Bonds to 100; add and subtract ones or tens to and from two-digit numbers" },
  { code: "2AS-4", strand: "AS", year: 2, part: "electronics", description: "Add and subtract two two-digit numbers within 100" },
  { code: "3AS-1", strand: "AS", year: 3, part: "fins", description: "Calculate complements to 100" },
  { code: "3AS-2", strand: "AS", year: 3, part: "electronics", description: "Add and subtract up to three-digit numbers using columnar methods" },
  { code: "3AS-3", strand: "AS", year: 3, part: "electronics", description: "Manipulate the additive relationship; use inverse operations to check" },

  // ── MD — Multiplication & Division (16) ────────────────────────────────
  { code: "2MD-1", strand: "MD", year: 2, part: "engine", description: "Recognise repeated addition contexts as multiplication (equal groups)" },
  { code: "2MD-2", strand: "MD", year: 2, part: "engine", description: "Relate grouping and sharing problems to multiplication and division" },
  { code: "3MD-1", strand: "MD", year: 3, part: "payloadBay", description: "Apply known multiplication and division facts to solve contextual problems" },
  { code: "3MD-2", strand: "MD", year: 3, part: "engine", description: "Understand and apply multiplication and division with larger equal groups" },
  { code: "4MD-1", strand: "MD", year: 4, part: "engine", description: "Multiply and divide whole numbers by 10 and 100; multiply 2- and 3-digit numbers" },
  { code: "4MD-2", strand: "MD", year: 4, part: "engine", description: "Manipulate multiplication and division equations; understand commutativity" },
  { code: "4MD-3", strand: "MD", year: 4, part: "payloadBay", description: "Understand and apply the distributive property of multiplication" },
  { code: "5MD-1", strand: "MD", year: 5, part: "engine", description: "Multiply and divide numbers up to 4 digits, including by 10, 100 and 1,000" },
  { code: "5MD-2", strand: "MD", year: 5, part: "engine", description: "Find factors and multiples of positive whole numbers" },
  { code: "5MD-3", strand: "MD", year: 5, part: "payloadBay", description: "Multiply up to 4-digit numbers by 1- and 2-digit numbers using columnar methods" },
  { code: "5MD-4", strand: "MD", year: 5, part: "payloadBay", description: "Divide up to 4-digit numbers by 1-digit numbers using short division" },
  { code: "6MD-1", strand: "MD", year: 6, part: "engine", description: "Divide multi-digit numbers using long division" },
  { code: "6AS/MD-1", strand: "MD", year: 6, part: "electronics", description: "Understand the difference between additive and multiplicative relationships" },
  { code: "6AS/MD-2", strand: "MD", year: 6, part: "electronics", description: "Use inverse operations to solve missing-number problems" },
  { code: "6AS/MD-3", strand: "MD", year: 6, part: "fuelTank", description: "Solve problems involving ratio relationships" },
  { code: "6AS/MD-4", strand: "MD", year: 6, part: "electronics", description: "Solve problems with two unknowns" },

  // ── F — Fractions (13) ─────────────────────────────────────────────────
  { code: "3F-1", strand: "F", year: 3, part: "fuelTank", description: "Interpret and write unit fractions as equal parts of a whole" },
  { code: "3F-2", strand: "F", year: 3, part: "payloadBay", description: "Interpret and write non-unit fractions of a whole" },
  { code: "3F-3", strand: "F", year: 3, part: "payloadBay", description: "Reason about the location of fractions on a number line" },
  { code: "3F-4", strand: "F", year: 3, part: "payloadBay", description: "Add and subtract fractions with the same denominator within 1" },
  { code: "4F-1", strand: "F", year: 4, part: "fuelTank", description: "Recognise equivalent fractions (fraction families)" },
  { code: "4F-2", strand: "F", year: 4, part: "payloadBay", description: "Convert between mixed numbers and improper fractions" },
  { code: "4F-3", strand: "F", year: 4, part: "payloadBay", description: "Add and subtract improper and mixed fractions with the same denominator" },
  { code: "5F-1", strand: "F", year: 5, part: "fuelTank", description: "Find fractions of quantities" },
  { code: "5F-2", strand: "F", year: 5, part: "payloadBay", description: "Find equivalent fractions and understand them as having the same value" },
  { code: "5F-3", strand: "F", year: 5, part: "payloadBay", description: "Recall decimal equivalents of common fractions" },
  { code: "6F-1", strand: "F", year: 6, part: "fuelTank", description: "Express fractions in their simplest form" },
  { code: "6F-2", strand: "F", year: 6, part: "payloadBay", description: "Compare fractions with different denominators" },
  { code: "6F-3", strand: "F", year: 6, part: "payloadBay", description: "Add and subtract fractions with different denominators" },

  // ── G — Geometry (11) ──────────────────────────────────────────────────
  { code: "1G-1", strand: "G", year: 1, part: "noseCone", description: "Recognise common 2D and 3D shapes" },
  { code: "1G-2", strand: "G", year: 1, part: "noseCone", description: "Compose 2D and 3D shapes from smaller shapes" },
  { code: "2G-1", strand: "G", year: 2, part: "noseCone", description: "Describe properties of shapes: sides, vertices, edges and faces" },
  { code: "3G-1", strand: "G", year: 3, part: "noseCone", description: "Recognise right angles as a property of shapes and as quarter turns" },
  { code: "3G-2", strand: "G", year: 3, part: "fins", description: "Identify horizontal, vertical, parallel and perpendicular lines" },
  { code: "4G-1", strand: "G", year: 4, part: "noseCone", description: "Identify acute, right and obtuse angles; recognise line symmetry" },
  { code: "4G-2", strand: "G", year: 4, part: "noseCone", description: "Compare and order angles" },
  { code: "4G-3", strand: "G", year: 4, part: "fins", description: "Describe positions on a coordinate grid (first quadrant)" },
  { code: "5G-1", strand: "G", year: 5, part: "noseCone", description: "Measure angles in degrees with a protractor" },
  { code: "5G-2", strand: "G", year: 5, part: "fins", description: "Translate and reflect shapes on a coordinate grid" },
  { code: "6G-1", strand: "G", year: 6, part: "noseCone", description: "Describe properties of shapes including lines of symmetry" },
];

export const CRITERIA_BY_CODE: Record<string, Criterion> = Object.fromEntries(
  CRITERIA.map((c) => [c.code, c]),
);

export const STRANDS: { id: Criterion["strand"]; label: string }[] = [
  { id: "NPV", label: "Number & Place Value" },
  { id: "NF", label: "Number Facts" },
  { id: "AS", label: "Addition & Subtraction" },
  { id: "MD", label: "Multiplication & Division" },
  { id: "F", label: "Fractions" },
  { id: "G", label: "Geometry" },
];