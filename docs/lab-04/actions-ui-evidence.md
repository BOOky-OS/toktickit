# Issue #59 Actions Taken UI evidence

Date: 2026-09-24. Assistant-run work on `feature/59-actions-ui`, based on the verified peer merge `3c303e637e24dc01bc45c6d15eaf74afb24d9b7a` for #58 / PR #65. These are feature-branch results, not final-main or independent peer execution.

Implementation commit: `a1b5223834f9bb29533fa3e96031c966cd60f66e`. PR [#66](https://github.com/BOOky-OS/toktickit/pull/66) targets lab4-staging. Checks were run against this implementation; the subsequent evidence update changes documentation only. Peer review and merge are pending. Build and whitespace checks were rechecked on 2026-09-25.

## Implemented scope

- Ticket Detail shows current actions to the owning Requester and Staff/Admin. Requesters have no action writes, assignee lookup or private revision controls.
- Staff/Admin can create, assign, edit, start, complete and cancel eligible actions. Forms show automatic creator, Bangkok date/time, conditional follow-up validation and plain-text attachment notes. Terminal actions remain visible and immutable.
- Paginated lists/history, later-page action hash links, captured revision snapshots, safe loading/empty/error states and explicit inaccessible-resource feedback.
- An ambiguous write freezes that attempt and retries its exact body/key. Conflict recovery retains the draft, loads current values and requires explicit review before saving again. Successful writes refresh Ticket/actions/history; unrelated comment drafts are retained.
- Dirty form cancellation/navigation asks for confirmation. Session expiry clears protected state through the existing auth provider. Native cancellation dialog has explicit keyboard focus containment, Escape/discard confirmation and focus restoration.
- Admin operational and comment/note controls now match the backend permission extension from #58. Requester-only attachment/create/indication permissions remain unchanged.

## Tests and results

Environment: Windows, Node 24.19.0, Vitest 4.1.10, local Chrome through Playwright, PostgreSQL 16.13. Existing dedicated Docker service `toktickit-lab4-test` is reused. Browser setup creates an owned random schema in `toktickit_lab3_test`, starts the real API on 3007 and frontend on 5177, uses real login/CSRF and owned temporary attachment storage, and cleans up its schema/storage on completion. The working database is not reset/migrated.

| Test ID / scope | Command | Result / evidence |
| --- | --- | --- |
| UI-01 and prior client regression | `npm run test --workspace client` | 15 files / 96 tests passed, no skips; `output/lab4-ui-green.txt`. Includes 12 Actions component cases and 2 action transport cases. |
| E2E-01 | `npm run test:e2e:lab4` | 8 browser tests passed in the full run; `output/lab4-ui-browser-final.txt`. Four business-flow cases and four responsive/keyboard cases. |
| Actions portion of E2E-04 | `npm run test:e2e:lab4 -- responsive-accessibility.spec.ts` | 4 cases passed (44.0s) after final dialog positioning/capture adjustments; `output/lab4-ui-visual-final.txt`. |
| Build | `npm run build` | Client and server passed. |
| Whitespace | `git diff --check` | Passed before implementation commit. |

UI-01 files: `client/tests/lab-04/ActionsTaken.test.tsx`, `ActionsApi.test.tsx`. Browser files: `e2e/lab-04/actions-taken-flow.spec.ts`, `responsive-accessibility.spec.ts`; config: `playwright.lab4.config.ts`.

The real browser tests cover two performers on one Ticket, assignment, start/complete/cancel, retained history, Requester read-only view, foreign ownership, inactive-assignee validation/cancellation, stale draft recovery, expired-session clearing and locating an action beyond page one. The lost-response scenario lets the real API commit via route.fetch, then deliberately drops the response; retry preserves the key and PostgreSQL confirms exactly one action. This is fault injection around a real persistence path, not mocked success data.

## Failures found and corrected

1. Initial new component test run failed to import the not-yet-created component. The tests were written before the feature implementation; the initial red run had no executed assertions because the module was absent (`output/lab4-ui-red.txt`).
2. Initial full client regression exposed old Admin read-only expectations and direct TicketDetail fixtures missing the new auth context. Adapted only those deliberate permission/context assumptions. Parallel jsdom workers also caused timeouts on this machine; limit workers to two and keep assertions/timeouts intact. Full rerun passed.
3. Browser flows passed initially, but all four keyboard cases caught focus escaping the cancellation dialog on Tab. Added explicit first/last focus wrapping and retained the assertions; all eight tests then passed.
4. Screenshot inspection found fixed-position capture artifacts when taking tall screenshots from a scrolled page. Use explicit fixed/inset/box-sizing dialog rules, capture evidence from scroll position zero, and use viewport captures for dialogs; independently assert the dialog fits the viewport. The full selected date/time is also readable as wrapping helper text on narrow layouts.

No tests were disabled. The server implementation is unchanged from #58; its historical 489-test result is not claimed as a fresh full server run here. New E2E tests exercise the real server for the current UI.

## Visual and keyboard review

Local generated screenshots: `artifacts/lab-04/screenshots/actions-taken/{desktop,tablet,mobile,narrow}/{create,list,cancel}.png`. These are ignored artifacts and are not committed. Viewports: 1440x900, 834x1112, 390x844 and 320x844.

- Native form labels, linked validation summary, invalid-field associations, live success/error text and 44px action controls are implemented.
- Automated checks cover keyboard Add, initial form/dialog focus, Tab containment, Escape cancellation, trigger focus restoration, refused draft navigation, dialog bounds and zero page horizontal overflow.
- Assistant inspected the 12-image overview and then the regenerated four dialog captures. Current captures show wrapping content and complete dialog text/buttons at all four sizes. Long mobile pages require scrolling; automated checks separately confirm no horizontal page overflow.
- 320px viewport is narrow-layout evidence, not an actual 200% browser zoom measurement. Formal contrast audit, broader product visual/keyboard review, screenshots of every role/state, full prior browser regression and final-main verification remain for #63/#64.

## Reproduce

Start the existing test container, set `TEST_DATABASE_URL` as described in [migration.md](migration.md), then run the commands above. Ports 3007/5177 must be free; the setup refuses to reuse a running app. Generated screenshots/logs remain excluded from Git.

Final Ticket resolution/cancel gates are #60, dashboards are #61/#62. This UI increment does not claim those features or the final product Definition of Done. Peer approval/merge into lab4-staging is required before starting #60.
