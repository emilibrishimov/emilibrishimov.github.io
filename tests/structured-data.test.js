// Checks that the structured data (JSON-LD) in index.html matches what the page shows:
// every role, organization, date, location, the degree, and the awards.
// No dependencies; run with:  node tests/structured-data.test.js

const fs = require("fs");
const path = require("path");

const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");

let passes = 0;
let failures = 0;

function expect(label, got, expected) {
  const a = JSON.stringify(got);
  const b = JSON.stringify(expected);
  if (a === b) {
    passes++;
  } else {
    failures++;
    console.log(`FAIL ${label}:\n  structured data: ${a}\n  page:            ${b}`);
  }
}

// --- Read the page. ------------------------------------------------------------------

const text = (s) => s.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
const section = (id) => {
  const start = html.indexOf(`<h2 id="${id}">`);
  return html.slice(start, html.indexOf("</section>", start));
};
// "<h3>Name <span class="duration" data-start=".." data-end="..">(..)</span></h3>"
const nameAndMonths = (headingHtml) => {
  const d = headingHtml.match(/data-start="([^"]+)"(?: data-end="([^"]+)")?/);
  return {
    name: text(headingHtml.replace(/<span class="duration"[\s\S]*?<\/span>/, "")),
    start: d && d[1],
    end: d ? d[2] : undefined,
  };
};
const items = (sectionHtml) => [...sectionHtml.matchAll(/<li>([\s\S]*?)<\/li>/g)].map((m) => m[1]);
const first = (s, re) => (s.match(re) || [])[1];

const page = { roles: [], advisory: [], education: [], awards: [] };

page.name = text(first(html, /<h1>([\s\S]*?)<\/h1>/));
page.location = text(first(html, /<p class="location">([\s\S]*?)<\/p>/));

for (const [, company] of html.matchAll(/<article class="company">([\s\S]*?)<\/article>/g)) {
  const org = nameAndMonths(first(company, /<h3>([\s\S]*?)<\/h3>/)).name;
  const url = first(company, /<h3><a href="([^"]+)"/);
  const location = text(first(company, /<p class="meta">([\s\S]*?)<\/p>/)).split(" · ")[0];
  for (const [, title] of company.matchAll(/<h4 class="title">([\s\S]*?)<\/h4>/g)) {
    const r = nameAndMonths(title);
    page.roles.push({ org, url, location, role: r.name, start: r.start, end: r.end });
  }
}

for (const li of items(section("early-career"))) {
  const r = nameAndMonths(first(li, /<h3>([\s\S]*?)<\/h3>/));
  page.roles.push({
    org: r.name,
    url: undefined,
    location: text(first(li, /<p class="meta">([\s\S]*?)<\/p>/)),
    role: text(first(li, /<p class="job">([\s\S]*?)<\/p>/)),
    start: r.start,
    end: r.end,
  });
}

for (const li of items(section("advisory"))) {
  const r = nameAndMonths(first(li, /<h3>([\s\S]*?)<\/h3>/));
  page.advisory.push({
    org: r.name,
    url: first(li, /<h3><a href="([^"]+)"/),
    description: text(first(li, /<p class="meta">([\s\S]*?)<\/p>/)).split(" · ")[0],
    start: r.start,
    end: r.end,
  });
}

for (const li of items(section("education"))) {
  page.education.push({
    school: text(first(li, /<h3>([\s\S]*?)<\/h3>/)),
    degree: text(first(li, /<p class="job">([\s\S]*?)<\/p>/)),
    year: text(first(li, /<span class="dates">([\s\S]*?)<\/span>/)),
  });
}

for (const li of items(section("awards"))) {
  const parts = [
    first(li, /<p class="job">([\s\S]*?)<\/p>/),
    first(li, /<h3>([\s\S]*?)<\/h3>/),
    first(li, /<p class="meta">([\s\S]*?)<\/p>/),
    first(li, /<span class="dates">([\s\S]*?)<\/span>/),
  ];
  page.awards.push(parts.map(text).join(", "));
}

// --- Read the structured data. -------------------------------------------------------

const json = first(html, /<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
if (!json) throw new Error("No JSON-LD block found in index.html");
const data = JSON.parse(json);

const isRole = (x) => x["@type"] === "OrganizationRole";
const ld = {
  name: data.name,
  location: data.homeLocation && data.homeLocation.name,
  roles: data.alumniOf.filter(isRole).map((r) => ({
    org: r.alumniOf.name,
    url: r.alumniOf.url,
    location: r.alumniOf.location,
    role: r.roleName,
    start: r.startDate,
    end: r.endDate,
  })),
  advisory: data.memberOf.map((r) => ({
    org: r.memberOf.name,
    url: r.memberOf.url,
    description: r.memberOf.description,
    start: r.startDate,
    end: r.endDate,
  })),
  education: [].concat(data.hasCredential).map((c) => ({
    school: c.recognizedBy.name,
    degree: c.name,
    year: c.dateCreated,
  })),
  schools: data.alumniOf.filter((x) => !isRole(x)).map((x) => x.name),
  awards: data.award,
};

// --- Compare. ------------------------------------------------------------------------

expect("@context and @type", [data["@context"], data["@type"]], ["https://schema.org", "Person"]);
expect("name", ld.name, page.name);
expect("home location", ld.location, page.location);
expect("number of roles", ld.roles.length, page.roles.length);
page.roles.forEach((r, i) => expect(`role ${i + 1} (${r.org}, ${r.role})`, ld.roles[i], r));
expect("number of advisory roles", ld.advisory.length, page.advisory.length);
page.advisory.forEach((r, i) => expect(`advisory ${i + 1} (${r.org})`, ld.advisory[i], r));
expect("education", ld.education, page.education);
expect("schools in alumniOf", ld.schools, page.education.map((e) => e.school));
expect("awards", ld.awards, page.awards);

console.log(`${passes} passed, ${failures} failed`);
process.exitCode = failures ? 1 : 0;
