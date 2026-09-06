# Roadmap

For maintainers choosing future work. This index separates product plans from
dated evidence. Read the owning plan and current implementation before starting
work; none of these entries establishes live provider readiness.

## Plans

| Area | Scope and status | Plan |
|---|---|---|
| Podcast platform | Site interfaces are implemented; the backend owns remaining jobs, provider evidence, and launch gates. Consult its current roadmap and live readiness before treating a step as pending or complete. | [Execution strategy](plans/podcast-platform.md) |
| Datatype analytics | The scoped Podcast analytics pilot is recorded in site v1.2.0. Broader accessibility/browser validation and second-consumer/shared-primitive gates remain listed for follow-up. | [Analytics rollout](plans/datatype-analytics.md) |
| Paid video player | Proposed for the first paid online screening or subscriber-only film release. Product, hosting, external-embed, and protection requirements remain proposal decisions. | [Paid-video proposal](plans/paid-video-player.md) |

The [Podcast integration guide](podcasts.md) documents the current site-facing
contracts. [CHANGELOG.md](../CHANGELOG.md) records delivered site releases;
backend/provider acceptance is owned by the Podcast repository.

## Historical evidence

- [Podcast staging snapshot — 2026-08-02](archive/2026-08-02-podcast-staging-evidence.md):
  former completion-plan baseline, detailed progress ledger, execution queue,
  and owner decisions.
- [Newsletter popup mobile QA — 2026-08-27](archive/2026-08-27-newsletter-popup-qa.md):
  one local visual/interaction check with its original screenshot paths.

Preserve dates, scope, and evidence links when archiving. Move reusable
procedures into the relevant guide rather than treating old successful runs
as current acceptance.

## Documentation ownership

Current guides are indexed in [README.md](../README.md#documentation).
Keep this roadmap concise and put detailed proposals under `plans/`.
Newsletter operations remain [beside the Worker](../workers/newsletter-subscribe/README.md);
shared-platform documentation remains in the
[pinned submodule](../shared/dust-wave-platform/README.md).
