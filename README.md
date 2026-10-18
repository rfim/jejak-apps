# Jejak Apps

Live site: https://rfim.github.io/jejak-apps/

**Jejak** is a developer screening service, branded **AI vs AI**: candidates' AI writes the CV, we check it. We sell the outcome (a verified shortlist), not "AI": AI is an internal tool and a reviewer checks every result.

How it works, as a three-stage funnel so only the shortlist gets the expensive check:
1. **CV triage** for every applicant.
2. **20-minute short test** for the top 20%.
3. **Full dossier** for the shortlist: live coding in an unfamiliar codebase (AI allowed; we assess how it is used), an explain-your-code interview, and employment/degree checks with the candidate's consent.

Evidence weights favour process you can watch and third-party records. Public code and portfolios are weighted low (0.3) because AI can generate them in minutes.

The site is a single static `index.html` with no build step. It includes the scoring maths, pricing, and a Data & AI section (data protection, AI cost per candidate, which sources can really be checked). This is a concept demo: all candidates and numbers are examples, and no AI runs in it yet.

## Mobile app

`app/` is an installable web app (PWA) with offline support.

- **Beranda:** AI vs AI summary, animated KPI tiles, agent highlights carousel, live agent activity (pull down to scan).
- **Kandidat:** search, stage filters, CV-vs-evidence ranking with animated reordering, swipe right to shortlist, swipe left to archive (with undo).
- **Dossier:** stage stepper, AI vs AI duel, job-ad similarity signals, verified employment years (BPJS, the Myinfo/CPF pattern in Singapore), claim graph, send a work test, schedule an interview.
- **Jadwal:** week strip, interview slots, add to calendar (.ics).
- **Akun:** biometric login (WebAuthn), notifications, light/dark theme, candidate mode (per-source consent, challenges, audit log), download or delete my data (UU PDP / PDPA).

On a phone, the root URL redirects to `app/`; on desktop the website stays. Add `?web=1` to keep the website on a phone.

Demo login: username `1234`, password `1234`. The check runs in the browser of a public static site, so it keeps casual visitors out and is not real security. Don't put real candidate data behind it.
