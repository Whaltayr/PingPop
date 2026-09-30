# PingPop ✳

A little square. A new connection.

Make contact, WhatsApp, call, email, SMS and website QR codes in your browser.
Responsive UI, live preview, PNG/SVG downloads, vCard downloads, copy content,
four high-contrast colours, optional local draft saving and a preview-only photo.
No account, database, API key, paid QR service or backend is required.

## Start locally (Windows 11 / Fedora)

Install Node.js 22.12+ (Node 24 LTS is suitable), then open a terminal **inside
the extracted `pingpop` folder**, where `package.json` is located:

```sh
npm ci
npm run dev
```

Open the local URL printed in the terminal, normally http://127.0.0.1:5173.
Keep the terminal running. Stop with Ctrl+C.

Windows: if PowerShell blocks `npm.ps1`, use `npm.cmd ci` and `npm.cmd run dev`.
There is no need to disable PowerShell security. Do not double-click index.html:
the source uses modules and must run through Vite.

## Deploy on GitHub + Vercel

1. Create an empty GitHub repository named `pingpop` (do not initialise a README).
2. In this project's folder run:

```sh
git init
git add .
git commit -m "Build PingPop QR generator"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/pingpop.git
git push -u origin main
```

Replace YOUR-USERNAME with your actual GitHub username. Authenticate with
GitHub's normal sign-in flow if asked. Never put access tokens in your code.

3. Open https://vercel.com/new and import the GitHub repository.
4. Root Directory: the directory containing package.json. If you uploaded
   a parent folder, select the nested pingpop folder instead.
5. Framework: **Vite**. Build command: **npm run build**. Output: **dist**.
6. No environment variables are needed. Click **Deploy**.
7. Open the generated HTTPS URL and test on your phone. The app is not already
   deployed by this source package; deployment happens in your Vercel account.

Vercel recognises Vite and subsequent Git pushes trigger deployments when the
repository integration is enabled. Domain availability is not guaranteed.

Official guide: https://vercel.com/docs/frameworks/frontend/vite

## How the code works

| File | Responsibility |
| --- | --- |
| `index.html` | Accessible form, mode buttons, contact preview and download controls. |
| `src/main.js` | Listens for typing, selects fields, creates QR images, handles downloads and opt-in localStorage. |
| `src/payload.js` | Validates inputs and converts them into vCard / tel / SMS / mailto / WhatsApp / web link text. |
| `src/style.css` | Colours, type, cards, focus states and mobile layouts. |
| `tests/payload.test.js` | Tests phone validation, escaping, Unicode, links and QR generation. |
| `vercel.json` | Build settings and security headers. |
| `package-lock.json` | Exact dependency versions for repeatable installs. Commit this. |

### Input → payload → QR → download

1. Typing triggers `render()` in main.js.
2. `buildPayload()` validates relevant fields for the selected mode.
3. Contact mode creates **vCard 3.0** text. Other modes create links such as
   `tel:+264812345678` or `https://wa.me/264812345678`.
4. The bundled `qrcode` library converts that text into a PNG and an SVG.
5. Download buttons save those files from the browser without uploading data.

`revision` is a counter that prevents a slow, older QR generation from replacing
newer input. Invalid input immediately hides the previous QR and disables downloads.

`escapeVCard()` protects the contact format against embedded newlines and reserved
characters. `foldLine()` folds long UTF-8 lines without splitting Unicode characters.
`encodeURIComponent()` safely encodes message and subject parameters in links.
`textContent` displays user input as text, never executable HTML.

### Why Vite + JavaScript instead of Next.js?

This small app has no server-side functionality. Vite builds plain static assets
with fewer dependencies, and vanilla JavaScript makes the event flow easy to learn.
Only `qrcode` is needed at runtime. This is separate from NamCommunity and changes
none of the marketplace files.

## Behaviour and limitations

- Enter international numbers with + and country code, e.g. +264812345678.
  The app checks format, not ownership or whether a number/WhatsApp account exists.
- Contact mode requires a first name and at least a phone number or email.
- Scan results depend on the camera/QR reader and installed apps. Saving contacts,
  making calls and sending messages require user interaction; this is not silent automation.
- SMS pre-filled message support varies by phone and messaging app.
- PNG is 1024px square; SVG scales for printing. Both export the **QR only**.
- Uploaded photos/logos are **preview only**, are not uploaded or saved in drafts,
  and are not included in QR/VCF exports. Embedding photos can make a contact QR
  too dense or unsupported. Use a separate hosted profile page in a future version
  if you need a photo on the recipient's phone.
- Static QR codes have no service-enforced expiry. If details change, regenerate
  and replace the old code. WhatsApp and websites still require working destinations.
- Anyone who gets your QR can read its data. It is encoding, not encryption.
- Opt-in drafts use unencrypted localStorage on the current browser/device only.
  Turn the checkbox off or click Clear details to delete the saved draft.
- No analytics or contact-upload requests are included. The hosting provider can
  still process normal connection/access metadata such as IP addresses.
- No number verification, OTP, dynamic redirect, scan analytics or account system.

## Checks before sharing

```sh
npm test
npm run build
npm run preview
```

Test the production preview and the deployed page. Generate and scan every QR
type you plan to use on an actual Android/iPhone; automated tests do not guarantee
every camera app's vCard/SMS compatibility. Check downloaded files, opt-in save
after refresh, clearing data, and a narrow mobile screen.

## Editing the design

Change brand text in index.html; change `--ink` and `--lime` in style.css. Add QR
colours only if they stay dark on a white background. Keep the four-module white
margin around the QR. Avoid covering the code with a logo without scan testing.

## Dependency maintenance

Run `npm audit` periodically and review dependency updates before deploying.
Never commit node_modules, .env files or secrets. They are excluded by .gitignore.
