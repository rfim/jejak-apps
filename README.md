# Jejak Apps

Live site: https://rfim.github.io/jejak-apps/

**Jejak** is a product concept for skill intelligence in hiring. An agent breaks a CV into claims, collects evidence the candidate has agreed to share (work samples, public code, structured references, verified certificates), tests the claims that have no evidence yet, and ranks candidates by what they can show rather than what they wrote.

The site is a single static `index.html` with no build step. All candidates and numbers on it are examples.

## Mobile app

`app/` is an installable web app (PWA) with a login screen, four tabs (Peringkat, Dossier, Bukti, Izin) and offline support through a service worker.

- On a phone, the root URL redirects to `app/`. On desktop the website stays. Add `?web=1` to keep the website on a phone.
- Install it on Android with the **Pasang** button, or on iPhone with Safari's Share → **Tambah ke Layar Utama**.
- Demo login: username `1234`, password `1234`. This check runs in the browser of a public static site, so it keeps casual visitors out and is not real security. Don't put real candidate data behind it.
