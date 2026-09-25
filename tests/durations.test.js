// Tests the inline duration script in index.html (the <script id="durations"> block).
// No dependencies; run with:  node tests/durations.test.js
//
// The script is extracted from index.html as-is and run against fake elements with a
// fake clock, in several time zones. The test also checks that every duration's
// data-start/data-end months agree with the dates shown on the page, and that the
// fallback text in the HTML matches what the script computes.

const fs = require("fs");
const path = require("path");

const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
const script = html.match(/<script id="durations">([\s\S]*?)<\/script>/);
if (!script) throw new Error('No <script id="durations"> found in index.html');
const code = script[1];

const RealDate = Date;
const MONTHS = "Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split(" ");
const TIME_ZONES = [
  "America/Los_Angeles",
  "America/New_York",
  "Europe/Sofia",
  "UTC",
  "Pacific/Kiritimati", // UTC+14
  "Pacific/Pago_Pago", // UTC-11
];

let passes = 0;
let failures = 0;

function expect(label, got, expected) {
  if (got === expected) {
    passes++;
  } else {
    failures++;
    console.log(`FAIL [${process.env.TZ || "page data"}] ${label}: got ${got}, expected ${expected}`);
  }
}

// Independent reference implementation of the rules: inclusive months, yr/yrs, mo/mos.
function format(months) {
  const y = Math.floor(months / 12);
  const m = months % 12;
  const parts = [];
  if (y) parts.push(y + (y === 1 ? " yr" : " yrs"));
  if (m) parts.push(m + (m === 1 ? " mo" : " mos"));
  return "(" + parts.join(" ") + ")";
}

// Runs the page script over fake elements. `items` are [start, end?] pairs; `now` is
// local-time Date constructor arguments. Returns each element's resulting text.
function run(items, now) {
  const els = items.map(([start, end]) => ({
    dataset: end === undefined ? { start } : { start, end },
    textContent: "FALLBACK",
  }));
  const document = { querySelectorAll: () => els };
  class FakeDate extends RealDate {
    constructor(...args) {
      if (args.length) super(...args);
      else super(...now);
    }
  }
  new Function("document", "Date", code)(document, FakeDate);
  return els.map((el) => el.textContent);
}

function check(label, items, now, expected) {
  run(items, now).forEach((got, i) => {
    expect(`${label} ${JSON.stringify(items[i])}`, got, expected[i]);
  });
}

// "Feb 2024" -> "2024-02"
function toAttr(text) {
  const [month, year] = text.split(" ");
  return `${year}-${String(MONTHS.indexOf(month) + 1).padStart(2, "0")}`;
}

// "Feb 2024 – Jul 2026", "Apr – Jul 2011", "Nov 2023 – present" -> [start, end|undefined]
function parseShownDates(text) {
  let [start, end] = text.split(" – ");
  if (end === "present") return [toAttr(start), undefined];
  if (!start.includes(" ")) start += " " + end.split(" ")[1];
  return [toAttr(start), toAttr(end)];
}

const DURATION = /<span class="duration" data-start="([^"]*)"(?: data-end="([^"]*)")?>([^<]*)<\/span>/;
const DURATION_ALL = new RegExp(DURATION.source, "g");

// --- Page data: attributes agree with the dates shown on the page. -------------------

function checkPageData() {
  const durations = [...html.matchAll(DURATION_ALL)];
  expect("number of durations on the page", durations.length, 14);

  // Titles and entries: the duration sits in a .row next to its .dates.
  for (const [, row] of html.matchAll(/<div class="row">([\s\S]*?)<\/div>/g)) {
    const d = row.match(DURATION);
    const shown = row.match(/<span class="dates">([^<]*)<\/span>/);
    if (!d || !shown) continue;
    const [start, end] = parseShownDates(shown[1]);
    expect(`data-start matches "${shown[1]}"`, d[1], start);
    expect(`data-end matches "${shown[1]}"`, d[2], end);
  }

  // Employers: the duration spans from the earliest role start to the latest role end.
  for (const [, company] of html.matchAll(/<article class="company">([\s\S]*?)<\/article>/g)) {
    const heading = company.match(/<h3>([\s\S]*?)<\/h3>/)[1];
    const d = heading.match(DURATION);
    const name = heading.replace(/<[^>]+>/g, "").replace(/\s*\(.*$/, "");
    const roles = [...company.matchAll(/<span class="dates">([^<]*)<\/span>/g)].map((m) =>
      parseShownDates(m[1])
    );
    const starts = roles.map((r) => r[0]).sort();
    const ends = roles.map((r) => r[1]);
    const end = ends.includes(undefined) ? undefined : ends.sort().at(-1);
    expect(`${name} data-start is its earliest role start`, d[1], starts[0]);
    expect(`${name} data-end is its latest role end`, d[2], end);
  }
}

// --- Script behaviour, repeated in each time zone. -----------------------------------

function checkScript(tz) {
  const now = [2026, 8, 24, 12]; // Sep 24 2026, noon

  // Fallback text in the HTML matches what the script computes. Ongoing durations
  // depend on today's date, so for those compare against the reference instead.
  const durations = [...html.matchAll(DURATION_ALL)];
  const today = new RealDate();
  const results = run(durations.map((m) => [m[1], m[2]]), [today.getFullYear(), today.getMonth(), today.getDate()]);
  durations.forEach((m, i) => {
    if (m[2]) {
      expect(`fallback text for ${m[1]}–${m[2]}`, results[i], m[3]);
    } else {
      const [y, mo] = m[1].split("-").map(Number);
      const months = today.getFullYear() * 12 + today.getMonth() - (y * 12 + mo - 1) + 1;
      expect(`ongoing duration from ${m[1]}`, results[i], format(months));
      // Not a failure: the script corrects it. Just a reminder to refresh the HTML.
      if (tz === TIME_ZONES[0] && m[3] !== format(months)) {
        console.log(`note: fallback text ${m[3]} for ${m[1]}–present is out of date; today it is ${format(months)}`);
      }
    }
  });

  // Formatting and inclusive counting.
  check("fixed", [
    ["2024-02", "2024-02"], ["2024-01", "2024-12"], ["2024-01", "2025-01"],
    ["2024-01", "2025-12"], ["2023-12", "2024-01"], ["2024-02", "2024-03"],
    ["2020-02", "2024-02"], ["2023-11", "2024-11"], ["2007-10", "2008-08"],
    ["1999-12", "2000-01"],
  ], now, [
    "(1 mo)", "(1 yr)", "(1 yr 1 mo)", "(2 yrs)", "(2 mos)", "(2 mos)",
    "(4 yrs 1 mo)", "(1 yr 1 mo)", "(11 mos)", "(2 mos)",
  ]);

  // "Present" at tricky local-time instants: month ends, leap day, year end, DST days.
  const starts = ["2023-11", "2024-02", "2024-03", "2025-01"];
  const instants = [
    ["leap day 23:59:59.999", [2024, 1, 29, 23, 59, 59, 999]],
    ["Mar 1 00:00 after leap day", [2024, 2, 1, 0, 0, 0, 0]],
    ["Feb 28 non-leap 23:59:59.999", [2025, 1, 28, 23, 59, 59, 999]],
    ["Dec 31 23:59:59.999", [2024, 11, 31, 23, 59, 59, 999]],
    ["Jan 1 00:00", [2025, 0, 1, 0, 0, 0, 0]],
    ["Apr 30 (30-day month)", [2024, 3, 30, 23, 59]],
    ["US DST start", [2026, 2, 8, 3, 30]],
    ["US DST end", [2026, 10, 1, 1, 30]],
    ["EU DST end", [2026, 9, 25, 2, 30]],
  ];
  for (const [label, instant] of instants) {
    const expected = starts.map((s) => {
      const [y, m] = s.split("-").map(Number);
      const months = instant[0] * 12 + instant[1] - (y * 12 + m - 1) + 1;
      return months >= 1 ? format(months) : "FALLBACK"; // start in the future
    });
    check(`present @ ${label}`, starts.map((s) => [s]), instant, expected);
  }

  // Bad data or a wrong clock leaves the fallback text alone.
  const invalid = [
    ["2023"], ["2023-13"], ["2023-00"], ["2023-1"], ["23-01"], ["abc"], [""],
    ["2023-01-05"], ["2023-06", "2023-05"], ["2027-01"], ["2023-01", "2023-13"],
    ["2023-01", "bad"],
  ];
  check("invalid", invalid, now, invalid.map(() => "FALLBACK"));
}

checkPageData();
for (const tz of TIME_ZONES) {
  process.env.TZ = tz; // Node applies TZ changes at runtime
  checkScript(tz);
}
process.env.TZ = "";

console.log(`${passes} passed, ${failures} failed`);
process.exitCode = failures ? 1 : 0;
