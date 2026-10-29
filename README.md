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
| Align hiring platform | Product development: candidate and employer workspaces, reciprocal interest, verification, privacy and interview coordination | Working pilot in active development | [Live pilot](https://align-career-match-rk.whiteboot69.chatgpt.site) · [Source and setup](projects/align/README.md) · [Portfolio entry](https://rachitkaura.github.io/#align) |
| Multi-agent personal AI system | Applied AI: an orchestrator and three specialist agents, task routing, scoped tool access and a 30-case evaluation harness used as a release gate | Independent project; linked repository shares sanitized agent specifications and design decisions | [Agent specifications](https://github.com/rachitkaura/multi-agent-system) · [Portfolio entry](https://rachitkaura.github.io/#case) |

Align’s Plus preview uses rules and templates. It does not currently connect AI model calls, paid billing, automatic resume parsing, email delivery or external calendar synchronization. The pilot and its source do not claim customer adoption or revenue.

## Align product and delivery facts

I am developing Align independently, beginning in October 2026. The product concept has been translated into connected candidate and employer workflows with profile publication, screening, mutual interest, messaging, application tracking and interview booking.

| Perspective | Work demonstrated |
| --- | --- |
| Technical program management | Connected the interface, API routes, Worker backend, D1/SQLite database, R2 file storage and versioned migrations; implemented ownership checks and interview-conflict protection |
| Product management | Defined candidate and employer journeys, discovery preferences, opt-in publication and the boundary between a fictional sample workspace and live hiring records |
| Recruiting and HR | Added screening questions, shortlists, team notes, application stages, interview availability, contact-sharing controls and manual company/profile verification |

| Implemented capability | Figure and meaning | Published source |
| --- | --- | --- |
| Core workspaces | **2**: candidate and employer | [Application interface](projects/align/app/components/live-hiring.tsx) |
| Job freshness | **30-day** reconfirmation window before an open role expires from public discovery | [Live hiring service](projects/align/app/lib/live-server.ts) |
| Pending profile ID review | Requests expire after **7 days**; this is an expiry rule, not a promised review turnaround | [Verification service](projects/align/app/lib/verification.ts) |
| Automated checks | **4 suites**: API isolation, career tools, live hiring and verification | [Check runner](projects/align/scripts/run-checks.mjs) |
| Interview calendar reminders | Downloadable ICS events contain a **15-minute** reminder | [Calendar generation](projects/align/app/lib/live.ts) |
| Company job-posting gates | **2 checks**: domain-control proof and separate admin approval | [Live hiring service](projects/align/app/lib/live-server.ts) |

These figures describe implemented capabilities and configured limits. The pilot continues to be refined through testing and iteration.

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

Updated October 29, 2026.
