# Writers Group unread-script recovery — October 22, 2026

## Cause and behavior

Started meetings exclude assigned scripts from the queue independently of their
moderation status. Approved scripts from the October 19 meeting therefore left
the queue, but the previous admin only offered Return to queue for Read or
Withdrawn scripts. The October 19 record was still Published when inspected.

The admin now offers Return to queue for Approved scripts outside the queue,
as well as Read and Withdrawn scripts. Both Community admin roles can use it.
Other scripts replaces the misleading Pending review heading above those cards.
The bilingual confirmation explains that returns append to the queue and can
then be reordered.

Returning releases only the script's historical meeting assignments through
`requeuedReadings`. Original script IDs, agenda snapshots and private PDFs are
preserved. No duplicate Read submissions are created. A repeated return leaves
an already-queued script in place, and a later meeting locks it normally. Lost
responses are read back through the existing API client. Return actions do not
enqueue writer or admin emails.

## Verification

- `npm run test:community`: 7 contract/form tests, 28 browser tests and 40 Worker
  tests passed; the Community dependency audit reported no vulnerabilities.
- Four focused return-flow browser cases passed again after the final template
  changes: English at 1440 px and Spanish at 320 px, each with Super-admin and
  Limited-admin. Covered confirmation cancellation, failed/lost responses,
  reordering, reload persistence, unchanged history/PDFs and private download.
  Screenshots were inspected at desktop and phone widths.
- Domain regression covers the October 19 cancellation, both unread scripts,
  placement on November 2, the following meeting's normal queue exclusion,
  repeated returns, rescheduled history, and Read/Withdrawn scripts.
- `npm run check:podcasts` passed, including secret/pin checks, the dependency
  policy, broader site/Podcast tests and 148 module syntax checks.
- `npm run build:community-staging` passed from an isolated copy of tracked
  source plus this change, generating 411 referenced WebPs and six Community
  page shells. Two unrelated, untracked News drafts were excluded; one references
  a missing image and blocks a build of the entire working directory.
- Worker packaging with `wrangler deploy --dry-run` and `git diff --check` passed.

The release updates markdown-it to 14.3.3 and constrains Vite to patched 7.3.7.
The owner explicitly renewed the existing build-only braces 3.0.3 exception
through November 5, 2026 (UTC). The advisory/version scope and fail-closed expiry
remain in force; see [the testing guide](../testing.md#temporary-build-dependency-exception).

## Requested schedule repair

The owner requested Conquest V3 and Baby Doll ahead of the existing queue for
November 2. The revision-checked D1 batch marks October 19 Cancelled,
releases both scripts, and reorders future agendas. Lost In Bar Carcosa and
The King In Yellow move to November 16. Original October 19 titles/authors and
script/PDF records remain intact. The repair contains no email-outbox writes.

The SQL was verified in isolated D1 against a redacted production snapshot;
unrelated fields are preserved and a stale revision performs no writes.

## Deployed Worker and live data

- Staging Worker: `2dbfec28-7bb4-4075-9ba3-0483a11442b6`. Deployed smoke checks
  passed, and both language shells and the versioned browser module contained
  the new return action and explanatory copy.
- Production Worker: `988506b3-5455-4c2c-9f28-850bea3e0e81`, serving 100% of
  traffic. Existing routes, secrets, bindings and scheduled triggers are retained.
- The production repair committed revision 27 to 28. All nine statements
  succeeded; a fresh read matched the prepared state exactly. There are still
  nine script submissions and the October 19 agenda is preserved.
- Production smoke checks passed. Public JSON and both server-rendered language
  pages show Conquest V3 / Baby Doll on November 2 and Lost In Bar Carcosa /
  The King In Yellow on November 16.

The matching production browser assets deploy through the normal Pages workflow
for the source commit containing this record. The Worker was deployed first.
No real sign-in, submission or notification emails were sent as part of testing.
Local interactions, deployed assets and live database/public-schedule checks are
separate evidence; no new physical-device acceptance is claimed.
