/**
 * Evidence check: which Sanity → GitHub repository_dispatch event types have
 * actually fired recently. The staging workflow already listens for
 * sanity-work-published; if that type never appears, the Sanity Manage webhook
 * is missing (not a workflow bug).
 *
 * Requires `gh` authenticated to the repo.
 * Run: node scripts/verify-sanity-cms-webhooks.mjs
 */
import { execFileSync } from "node:child_process";

const EXPECTED = [
  "sanity-homepage-published",
  "sanity-abo-published",
  "sanity-about-published",
  "sanity-contact-published",
  "sanity-work-published",
  "sanity-service-published",
  "sanity-cms-published",
];

function ghJson(args) {
  const out = execFileSync("gh", args, { encoding: "utf8" });
  return JSON.parse(out);
}

const runs = ghJson([
  "run",
  "list",
  "--event",
  "repository_dispatch",
  "--limit",
  "100",
  "--json",
  "displayTitle,createdAt,conclusion,databaseId",
]);

const counts = Object.fromEntries(EXPECTED.map((t) => [t, 0]));
const other = {};

for (const run of runs) {
  const title = run.displayTitle || "";
  const known = EXPECTED.find((t) => title === t || title.startsWith(t));
  if (known) {
    counts[known] += 1;
  } else {
    other[title] = (other[title] || 0) + 1;
  }
}

console.log("repository_dispatch counts (last up to 100 runs):");
for (const t of EXPECTED) {
  console.log(`  ${t}: ${counts[t]}`);
}
if (Object.keys(other).length) {
  console.log("  other:", other);
}

const missingWork = counts["sanity-work-published"] === 0;
const hasHomepage = counts["sanity-homepage-published"] > 0;

if (hasHomepage && missingWork) {
  console.error(
    "\n::error::Work publish webhook gap: homepage dispatches exist, but sanity-work-published never fired.",
  );
  console.error(
    "Fix in Sanity Manage → project tgx6e6jg → API → Webhooks: create Work webhook",
  );
  console.error(
    '  filter: !(_id in path("drafts.**")) && _type == "work"',
  );
  console.error('  event_type: "sanity-work-published"');
  console.error(
    "  URL: https://api.github.com/repos/mjeker99-collab/studiojeker-website/dispatches",
  );
  console.error(
    "Workflow .github/workflows/deploy-staging.yml already accepts this event type.",
  );
  process.exit(2);
}

if (!hasHomepage && missingWork) {
  console.error(
    "\n::warning::No homepage or work repository_dispatch events in the sample.",
  );
  process.exit(0);
}

console.log("\nverify-sanity-cms-webhooks: Work dispatch type observed (or homepage absent).");
