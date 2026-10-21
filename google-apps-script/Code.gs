/**
 * Wedding RSVP receiver. Paste this into Extensions → Apps Script of your RSVP Google Sheet,
 * then Deploy → New deployment → Web app (Execute as: Me, Who has access: Anyone).
 * Every reply from the website lands on the "RSVPs" tab. If the same name replies again
 * (they tapped "Change my answer"), their existing row is updated instead of adding a new one.
 */

var SHEET_NAME = 'RSVPs';
var HEADERS = ['Received', 'Name', 'Attending', 'People', 'Party names', 'Dietary', 'Phone', 'Message'];

// Put your email here to get an email for each reply, e.g. 'you@gmail.com'. Leave '' for none.
var NOTIFY_EMAIL = '';

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    var d = JSON.parse(e.postData.contents);

    // Spam trap: real guests never fill the hidden "website" field.
    if (d.website) return json({ ok: true });

    var name = clean(d.name, 120);
    var attending = d.attending === 'Yes' ? 'Yes' : d.attending === 'No' ? 'No' : '';
    if (!name || !attending) return json({ ok: false, error: 'missing name or answer' });

    var row = [
      new Date(),
      name,
      attending,
      attending === 'Yes' ? Math.min(Math.max(parseInt(d.count, 10) || 1, 1), 10) : 0,
      clean(d.party, 300),
      clean(d.dietary, 300),
      clean(d.phone, 40),
      clean(d.message, 1000)
    ];

    lock.waitLock(10000);
    var sh = sheet();
    var existing = findRow(sh, name);
    if (existing) sh.getRange(existing, 1, 1, row.length).setValues([row]);
    else sh.appendRow(row);
    lock.releaseLock();

    if (NOTIFY_EMAIL) {
      MailApp.sendEmail(NOTIFY_EMAIL, 'RSVP: ' + name + ' – ' + attending,
        HEADERS.map(function (h, i) { return h + ': ' + row[i]; }).join('\n'));
    }
    return json({ ok: true });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

// Opening the web app link in a browser just confirms it is running.
function doGet() {
  return json({ ok: true, message: 'RSVP endpoint is running' });
}

function sheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  if (sh.getLastRow() === 0) {
    sh.appendRow(HEADERS);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
  }
  return sh;
}

// Row number of an earlier reply with the same name (ignoring case and extra spaces), or 0.
function findRow(sh, name) {
  var last = sh.getLastRow();
  if (last < 2) return 0;
  var key = name.toLowerCase().replace(/\s+/g, ' ');
  var names = sh.getRange(2, 2, last - 1, 1).getValues();
  for (var i = 0; i < names.length; i++) {
    if (String(names[i][0]).toLowerCase().replace(/\s+/g, ' ').trim() === key) return i + 2;
  }
  return 0;
}

// Text only, trimmed, and never starting with = + - @ so Sheets won't treat it as a formula.
function clean(v, max) {
  var s = String(v == null ? '' : v).trim().slice(0, max);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
