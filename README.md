# Jejak Apps

Live site: https://rfim.github.io/jejak-apps/

**Jejak** is a product concept for skill intelligence in hiring, branded **AI vs AI**: candidates' AI writes the CV, Jejak's AI checks it. An agent breaks a CV into claims, collects evidence the candidate has agreed to share (work samples, public code, structured references, verified certificates), tests the claims that have no evidence yet, and ranks candidates by what they can show rather than what they wrote.

The site is a single static `index.html` with no build step. All candidates and numbers on it are examples.

## Mobile app

`app/` is an installable web app (PWA) with offline support.

- **Beranda:** AI vs AI summary, animated KPI tiles, agent highlights carousel, live agent activity (pull down to scan).
- **Kandidat:** search, stage filters, CV-vs-evidence ranking with animated reordering, swipe right to shortlist, swipe left to archive (with undo).
- **Dossier:** stage stepper, AI vs AI duel, job-ad similarity signals, verified employment years (BPJS, the Myinfo/CPF pattern in Singapore), claim graph, send a work test, schedule an interview.
- **Jadwal:** week strip, interview slots, add to calendar (.ics).
- **Akun:** biometric login (WebAuthn), notifications, light/dark theme, candidate mode (per-source consent, challenges, audit log), download or delete my data (UU PDP / PDPA).

On a phone, the root URL redirects to `app/`; on desktop the website stays. Add `?web=1` to keep the website on a phone.

Demo login: username `1234`, password `1234`. The check runs in the browser of a public static site, so it keeps casual visitors out and is not real security. Don't put real candidate data behind it.
