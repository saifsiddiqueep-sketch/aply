/**
 * UAply early-access welcome emails, sent by Google's servers (no computer, Chrome or Claude app needed).
 * Lives in the same Apps Script project as reply-tracker.gs and reuses its SUBJECT and FROM_ALIAS.
 *
 * - The moment someone submits the "Get early access to UAply" form, onSignup() emails them.
 * - sweepSignups() also runs every hour as a safety net, in case a form trigger is ever missed.
 * - Never emails anyone twice: it remembers who it emailed AND checks the Sent folder first.
 * - Skips bad addresses, the owner, and anyone who replied "unsubscribe".
 * - Each person gets a welcome line written for them. If an Anthropic API key is saved as the script
 *   property ANTHROPIC_API_KEY, Claude writes that line; otherwise a line is chosen from their answers.
 *
 * Install once: run installWelcome() and click Allow. The form must be shared with this account as an editor.
 */

const FORM_ID = '1ewPyuVt5Hi7AneRWJVmujjFxe1IHFgl-eduFvw9HvPQ';
const FEEDBACK_URL = 'https://forms.gle/85N6Jg1afL6FQM4x8';
const SKIP_EMAILS = ['saifsiddiqueep@gmail.com', 'uaplytechnologies@gmail.com', 'uaplytechnologies@uaply.net'];
const CLAUDE_MODEL = 'claude-haiku-5-5';

function installWelcome() {
  ScriptApp.getProjectTriggers()
    .filter(t => ['onSignup', 'sweepSignups'].includes(t.getHandlerFunction()))
    .forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('onSignup').forForm(FORM_ID).onFormSubmit().create();
  ScriptApp.newTrigger('sweepSignups').timeBased().everyHours(1).create();
  sweepSignups();
  Logger.log('Welcome emails are on. Already handled: ' + Object.keys(welcomed_()).length);
}

function onSignup(e) {
  handleSignup_(e.response);
}

function sweepSignups() {
  FormApp.openById(FORM_ID).getResponses().forEach(handleSignup_);
}

function welcomed_() {
  return JSON.parse(PropertiesService.getScriptProperties().getProperty('WELCOMED') || '{}');
}

function handleSignup_(resp) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(60000)) return;                     // another run is busy; the hourly sweep will catch up
  try {
    const a = {};
    resp.getItemResponses().forEach(ir => { a[ir.getItem().getTitle().trim()] = String(ir.getResponse() || '').trim(); });
    const email = (a['Email'] || '').toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/.test(email) || SKIP_EMAILS.includes(email)) return;

    const done = welcomed_();
    if (done[email]) return;
    const already = GmailApp.search('in:sent to:' + email + ' subject:"' + SUBJECT + '"', 0, 1).length > 0;
    const unsub = GmailApp.search('from:' + email + ' unsubscribe', 0, 1).length > 0;
    if (!already && !unsub) {
      const first = firstName_(a['Full Name']);
      sendWelcome_(email, first, introFor_(first, a['What best describes you?'], school_(a['School or employer'])));
    }
    done[email] = already ? 'found in Sent' : unsub ? 'unsubscribed' : new Date().toISOString();
    PropertiesService.getScriptProperties().setProperty('WELCOMED', JSON.stringify(done));
  } finally {
    lock.releaseLock();
  }
}

function firstName_(full) {
  const w = String(full || '').trim().split(/\s+/)[0];
  return w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : 'there';
}

function school_(s) {
  s = String(s || '').trim();
  if (/drexel/i.test(s)) return 'Drexel';
  if (/temple/i.test(s)) return 'Temple';
  if (/\bu?penn\b|university of pennsylvania/i.test(s)) return 'Penn';
  if (!s || /^(school|employer|n\/?a|none)$/i.test(s)) return '';
  return s.replace(/\s+/g, ' ');
}

function introFor_(first, role, school) {
  const key = PropertiesService.getScriptProperties().getProperty('ANTHROPIC_API_KEY');
  if (key) {
    try {
      const r = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
        method: 'post', contentType: 'application/json', muteHttpExceptions: true,
        headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01' },
        payload: JSON.stringify({
          model: CLAUDE_MODEL, max_tokens: 120,
          messages: [{ role: 'user', content:
            'Write ONE warm, natural sentence (max 30 words) thanking ' + first + ' for signing up for early access to UAply, ' +
            'a swipe-to-apply job app for students. They describe themselves as: "' + (role || 'unknown') + '". ' +
            'School or employer: "' + (school || 'unknown') + '". Mention their situation or school only if known. ' +
            'No exclamation marks, no emojis, no made-up facts, no greeting, no name at the start. Reply with the sentence only.' }],
        }),
      });
      const text = JSON.parse(r.getContentText()).content[0].text.trim().replace(/^"|"$/g, '');
      if (r.getResponseCode() === 200 && text.length > 20 && text.length < 260) return text;
    } catch (e) { /* fall through to the written lines below */ }
  }
  const at = school ? ' at ' + school : '';
  if (/recent grad/i.test(role)) return 'Thanks for signing up for early access to UAply, and congratulations on graduating. We are building it to make that first job search a lot easier.';
  if (/about to graduate/i.test(role)) return 'Thanks for signing up for early access to UAply. With graduation coming up' + at + ', we hope it makes your job search a lot easier.';
  if (/looking for a job/i.test(role)) return 'Thanks for signing up for early access to UAply. We know the job search can be a grind, and we are building UAply to make it lighter.';
  return school
    ? 'Thanks for signing up for early access to UAply. It is great to have another ' + school + ' student with us from the very start.'
    : 'Thanks for signing up for early access to UAply. It is great to have you with us from the very start.';
}

function signature_() {
  try {
    const sig = Gmail.Users.Settings.SendAs.get('me', FROM_ALIAS).signature;   // the same signature Gmail adds by hand
    if (sig) return '<br><div>--</div>' + sig;
  } catch (e) { /* Gmail advanced service not enabled: use the plain signature */ }
  return '<p style="color:#555;font-size:13px">--<br><b>UAply Technologies</b><br>UAply Team<br>Email: ' + FROM_ALIAS + '</p>';
}

function sendWelcome_(email, first, intro) {
  const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const p = s => '<p style="margin:0 0 16px">' + s + '</p>';
  const html = '<div style="font-family:Arial,sans-serif;font-size:16px;line-height:1.6;color:#222;max-width:560px">' +
    p('Hi ' + esc(first) + ',') + p(esc(intro)) +
    p("We're still building, and we want it shaped by people who'll actually use it. Could you take one minute to tell us what you'd want from a job-search app?") +
    p('<a href="' + FEEDBACK_URL + '" style="background:#B3264A;color:#ffffff;text-decoration:none;font-weight:bold;padding:14px 24px;border-radius:6px;display:inline-block">Share your thoughts (1 minute)</a>') +
    p('You can also just reply to this email. We read every message. We will email you when early access opens.') +
    p('Thanks again,<br>The UAply Team') +
    '<p style="margin:0 0 16px;font-size:13px;color:#6b6b6b">Not interested? Reply "unsubscribe" and we\'ll remove you right away.</p></div>' + signature_();
  const text = 'Hi ' + first + ',\n\n' + intro + "\n\nWe're still building, and we want it shaped by people who'll actually use it. " +
    "Could you take one minute to tell us what you'd want from a job-search app?\n\nShare your thoughts (1 minute): " + FEEDBACK_URL +
    '\n\nYou can also just reply to this email. We read every message. We will email you when early access opens.\n\nThanks again,\nThe UAply Team\n\n' +
    'Not interested? Reply "unsubscribe" and we\'ll remove you right away.';
  GmailApp.sendEmail(email, SUBJECT + ', ' + first, text, { from: FROM_ALIAS, name: 'UAply', htmlBody: html });
}
