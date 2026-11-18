# Endocrinology Decision Team · DSH plugin

English | [中文](README.md)

A decision workbench for frontline endocrinologists: **rank danger before probability**. Not a chat box — a table you can decide at. Enter the case, and the differential is ranked on two axes (likelihood × harm if missed) with counter-evidence required on every row; an emergency red flag interrupts everything.

## What you get

| Installed | Content |
|---|---|
| **Sidebar panel** `Endo Decision` | Case intake, six workflows, role strip, differential table, workup path, treatment plan, six evidence grades |
| **Skill** `endocrinology-decision-team` | The attending-physician standard: nine iron rules, six evidence grades, three output modes, a four-step evidence check |
| One click | **Copy case brief** puts the structured fact pack plus the hard requirements on the clipboard |

## Inside the panel

1. **Case intake** — chief complaint & timeline, key positives, key negatives (excluded directions), current medications, existing labs (value + unit + assay).
2. **Six workflows** — clinic quick-decision, complex differential, treatment plan, evidence update, case review, cross-specialty. Switching a workflow lights up **only the roles actually involved** (eight exist; a simple question must not light all eight).
3. **Differential table** — Diagnosis / Supporting / **Against** / Likelihood / Harm if missed / How to exclude. Default **dual-axis sort**; a row with an empty "Against" is highlighted and counted as **invalid output** — an enforced rule, not a hint.
4. **Workup path** — one node per line, branch with "if A positive → …"; anything not done reads "Not assessed" and is never used as a negative.
5. **Treatment plan** — targets / drug / dose range / monitoring / **one of six evidence grades** (guideline strong, guideline weak, RCT, single-arm phase II, mechanistic, inferred).
6. **Emergency red flags** — acute diabetic complications, severe hypoglycemia, thyroid storm, myxedema coma, adrenal crisis, pituitary apoplexy, severe hyponatremia, hypercalcemic crisis, TED optic neuropathy, nodule compression. Any hit collapses the workbench into one red banner and asks for three lines: do now / send where / do not do.

The footer always states that **final decisions and sign-off remain with the attending physician**.

## Flow

1. Open `Endo Decision` in the sidebar and fill the case in.
2. Pick a workflow and build the differential (write the counter-evidence — every row).
3. Hit **Copy case brief** and paste it into the chat.
4. The chat answers under `endocrinology-decision-team`; paste the conclusions back if you want them stored.

The panel captures, ranks and validates. Medical judgement comes from the skill-constrained answer.

## Install

```sh
dsh plugin --profile web add "https://github.com/flying-ovaltine/endo-decision-workbench/releases/latest/download/dsh-endo-decision-team.tgz"
```

## Boundaries

- **No final diagnosis, no prescriptions** — analysis and a path only.
- Citations stop at "guideline full name + edition" or "journal + year"; unverified editions read "edition to verify". No DOI, no sample sizes, no HR/OR.
- Anything not performed is "Not assessed", never treated as negative.
- For clinical decision training and support only; not medical advice.

## License

MIT © Yang Yang
