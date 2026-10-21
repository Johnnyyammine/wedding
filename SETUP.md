# Wedding website: setup

A one-page, phone-first invitation site with an RSVP form. It costs nothing to run:
- **GitHub Pages** hosts the site.
- **A Google Sheet** stores the RSVPs.

| File | What it is |
|---|---|
| `index.html` | All the words on the page: names, times, places, RSVP questions |
| `style.css` | Colours, fonts and layout |
| `app.js` | Countdown, gallery, calendar button, sending the RSVP |
| `config.js` | Wedding time, RSVP deadline, the Google Sheet link |
| `photos/` | The shrunk photos that go online (made by the photo tool) |
| `photos-original/` | Your full-size photos. They stay on your Mac and are never uploaded. |
| `tools/prepare_photos.sh` | Shrinks the photos and builds the gallery list |
| `google-apps-script/Code.gs` | The small script that saves RSVPs into your Google Sheet |

---

## 1. Add your photos

1. Put your photos in `photos-original/`. JPG, PNG and iPhone HEIC all work.
2. Name the cover photo `hero` (e.g. `hero.jpg`). A portrait photo works best because it fills the phone screen.
3. The other photos appear in alphabetical order by file name, so you can rename them `01 …`, `02 …` to set the order.
4. Run:
   ```
   bash tools/prepare_photos.sh
   ```
   The tool resizes each photo to about 200–400 KB, so the page loads quickly on mobile data.

## 2. Create the RSVP Google Sheet

1. Go to sheets.new and name the sheet, e.g. *Wedding RSVPs*.
2. Open **Extensions → Apps Script**.
3. Delete whatever code is there, then paste in everything from `google-apps-script/Code.gs`.
4. Click **Save**.
5. Optional: to get an email for every reply, put your address in `NOTIFY_EMAIL`.
6. Click **Deploy → New deployment**, then the gear icon → **Web app**:
   - Execute as: **Me**
   - Who has access: **Anyone**
7. Click **Deploy**. Google asks you to authorise it:
   - Choose your account → **Advanced** → **Go to … (unsafe)** → **Allow**.
   - The warning appears because you wrote the script yourself and Google hasn't reviewed it. That's normal.
8. Copy the **Web app URL**. It ends in `/exec`.
9. Paste that URL into `config.js` as `rsvpUrl: 'https://script.google.com/macros/s/…/exec'`.

Replies appear in the **RSVPs** tab:

| Received | Name | Attending | People | Party names | Dietary | Phone | Message |
|---|---|---|---|---|---|---|---|

If someone answers again under the same name, their row is updated rather than duplicated. To use the replies in the planner, use **File → Download → .xlsx**.

> **If you change Code.gs later**, go to **Deploy → Manage deployments → ✏️ → Version: New version → Deploy**. This keeps the same URL.

## 3. Put the site online with GitHub Pages

1. Create a free account at github.com if you don't have one.
2. Create a **new repository** named `wedding`. It must be **Public**, because free Pages only works with public repos.
3. Upload the contents of this `Wedding_Website` folder to it.
   - **Easy way:** on the repo page, click **Add file → Upload files**. Drag in everything **except** `photos-original`, then click **Commit**.
   - **Terminal way:** run these from inside `Wedding_Website`. The `.gitignore` already leaves out `photos-original`.
     ```
     git init && git add . && git commit -m "Wedding website"
     git branch -M main
     git remote add origin https://github.com/YOUR-USERNAME/wedding.git
     git push -u origin main
     ```
4. In the repo, go to **Settings → Pages → Source: Deploy from a branch → main / (root) → Save**.
5. After about a minute the site is live at **https://YOUR-USERNAME.github.io/wedding/**.

## 4. Make the WhatsApp preview look nice

When you paste the link into WhatsApp, the preview shows the cover photo only if the link to it is a full web address. In `index.html`:

1. Find the two lines that contain `YOUR-USERNAME`.
2. Replace `YOUR-USERNAME` with your GitHub username.
3. Upload the file again.

## 5. Check before sending

- Open the link on your own phone and send yourself a test RSVP. Check that it shows up in the Sheet, then delete that row.
- Tap every **Google Maps / Waze** button and make sure it lands on the right place. If one doesn't:
  1. Find the place in Google Maps.
  2. Tap **Share** and copy the link.
  3. Replace that button's `href` in `index.html` with the copied link.
  4. For the embedded map, use **Share → Embed a map**. Copy only the `src="…"` address into the `<iframe>`.

## Optional: your own domain (~$10–15 a year)

1. Buy a domain such as `johnnyandcarla.com` from Namecheap, Cloudflare or Porkbun.
2. In the repo, go to **Settings → Pages → Custom domain**, type the domain and follow GitHub's DNS instructions.
3. Tick **Enforce HTTPS**.

## Preview on your Mac

```
python3 -m http.server 8737 --directory Wedding_Website
```
Then open http://localhost:8737. While `rsvpUrl` in `config.js` is empty, the form runs in preview mode and saves nothing.
