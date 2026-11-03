# Rachit Kaura

Technical program leadership, product development and applied AI.

[Visit the portfolio](https://rachitkaura.github.io) · [Selected projects](https://rachitkaura.github.io/#projects) · [LinkedIn](https://linkedin.com/in/rachit-kaura)

I lead technology delivery at the Canada Revenue Agency, coordinating engineering and business teams on national programs. Outside work, I’m developing Align, a hiring platform, and building multi-agent AI workflows.

## Program delivery

- **Automatic Tax Filing:** program planning and cross-team dependencies across approximately eight sub-projects and nearly 30 delivery teams, with a roadmap through 2029.
- **T1 Adjustments Modernization:** took over an eight-figure modernization across 14+ Java and mainframe applications and 50+ contributors. Delivered two major releases on schedule and under planned IT cost, with zero post-go-live defects; led testing and release gates that resolved 170+ defects before UAT and managed 12+ formal change requests.

Current formal role: **Project Leader (Acting), Canada Revenue Agency**, September 2023 to present. Earlier roles were Senior Information Technology Analyst (September 2022–September 2023) and Information Technology Analyst (August 2021–August 2022). The 7+ years of experience covers enterprise systems, software delivery and automation across CRA, Bell Mobility and Canon Canada.

Reporting automation: built **five Excel VBA automations** using Jira data, reducing manual preparation **per report from days to approximately five minutes**, while refreshing dashboards and drafting follow-up messages.

## Selected projects

| Project | Focus | Current stage | Explore |
| --- | --- | --- | --- |
| Align hiring platform | Two-sided hiring: swipe discovery, explainable fit, work evidence, review deadlines and mutual-interest interviews | Independent working pilot in active development | [Interactive demo — no signup](https://align-career-match-rk.rkaura94.chatgpt.site/demo) · [Source snapshot](projects/align/README.md) · [Portfolio entry](https://rachitkaura.github.io/#align) |
| Multi-agent personal AI system | Applied AI: an orchestrator and three specialist agents, task routing, scoped tool access and a 30-case evaluation harness used as a release gate | Independent project; linked repository shares sanitized agent specifications and design decisions | [Agent specifications](https://github.com/rachitkaura/multi-agent-system) · [Portfolio entry](https://rachitkaura.github.io/#case) |

## Align: your next move, mutual

I am developing Align independently, beginning in October 2026. The working pilot connects candidates and hiring teams through a shared hiring journey. [Open the current demo](https://align-career-match-rk.rkaura94.chatgpt.site/demo) and switch between Candidate and Hiring team to see both sides. The demo uses fictional data and requires no signup.

| Journey | What to explore in the current demo |
| --- | --- |
| Discover and understand fit | Swipe through roles with profile fit on the card; inspect required-skill matches, relevant experience, start-date alignment and missing information |
| Prepare an application | Create editable résumé and cover-letter drafts for a role; link GitHub and profile documents; review optional materials for each swipe, available to the hiring team after mutual interest |
| Show the work | Describe a project's problem, personal contribution and outcome; add supporting evidence and choose where a work example is shared |
| Set expectations | Calibrate essential evidence, trainable gaps and transferable experience; reserve a review place with a written outcome deadline; review in capped batches |
| Make it mutual | Open messages and book an interview after reciprocal interest, with downloadable calendar files |

**Scoring and evidence:** profile fit uses required skills, relevant experience and preferred start date. Missing details are left out of the score. Working preferences and employer evidence checks do not affect it. Work claims remain self-reported; a recorded evidence check is limited to its stated scope and application.

**Current stage:** a working pilot in active development, without adoption or revenue claims. Career drafting uses rules and templates, not a connected AI model. Drafts remain editable. Calendar support uses downloadable files rather than external calendar synchronization.

### Product and technical delivery

| Perspective | Work demonstrated |
| --- | --- |
| Technical program management | Connected interface, API routes, Worker backend, D1/SQLite, private R2 storage and versioned migrations; documented ownership checks, booking-conflict protection and automated checks |
| Product management | Defined both journeys, opt-in publication, explainable scoring, candidate-controlled materials and work evidence; iterated on mobile discovery, inbox structure and review expectations |
| Recruiting and HR | Connected calibration, candidate comparison, scoped evidence review, shared pipelines, written outcomes and mutual-interest interview coordination |

### Public source snapshot

The code under `projects/align/` was exported on **October 29, 2026**. The hosted demo has continued to evolve; newer scoring, review-batch, work-proof and profile-material workflows are not represented by this earlier export. The source link is for implementation review and setup, not a claim of parity with the current demo.

| Snapshot capability | Figure and meaning | Published source |
| --- | --- | --- |
| Core workspaces | **2**: candidate and employer | [Application interface](projects/align/app/components/live-hiring.tsx) |
| Job freshness | **30-day** reconfirmation window before an open role expires from public discovery | [Live hiring service](projects/align/app/lib/live-server.ts) |
| Pending profile ID review | Requests expire after **7 days** in this snapshot; not a promised review turnaround. Portrait and photo-ID submissions are paused in the current demo | [Verification service](projects/align/app/lib/verification.ts) |
| Automated checks | **4 suites**: API isolation, career tools, live hiring and verification | [Check runner](projects/align/scripts/run-checks.mjs) |
| Interview calendar reminders | Downloadable ICS events contain a **15-minute** reminder | [Calendar generation](projects/align/app/lib/live.ts) |
| Company job-posting gates | **2 checks**: domain-control proof and separate admin approval | [Live hiring service](projects/align/app/lib/live-server.ts) |

These are source capabilities and configured limits, not measured hiring outcomes or evidence of an independent security audit.

## This repository

| Path | Purpose |
| --- | --- |
| `index.html` | Portfolio page served by GitHub Pages |
| `og-image.png` | Social-sharing preview image |
| `projects/align/` | Align application code, tests, schema migrations and project documentation |
| `.github/workflows/import-align.yml` | Manually triggered workflow used to import the prepared Align source archive |
| `Align_GitHub_Project.zip` | Original archive used for the application-source import |

The portfolio is a static page. Align’s full application runs separately on a Worker backend; its source is published here for review and continued development.

## Contact

Based in the Greater Toronto Area and interested in remote technical program management roles spanning software delivery, product development and applied AI.

- Email: [rkaura94@gmail.com](mailto:rkaura94@gmail.com)
- LinkedIn: [rachit-kaura](https://linkedin.com/in/rachit-kaura)

Updated November 2, 2026.
