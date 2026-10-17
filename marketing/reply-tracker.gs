/**
 * UAply Reply Tracker: a Google Apps Script bot that runs inside uaplytechnologies@gmail.com.
 *
 * What it does, every 5 minutes, on Google's servers (your computer can be off):
 *   1. Finds new replies to the "Quick question about your job search" emails.
 *   2. Logs each one in the "UAply Reply Tracker" Google Sheet (name, email, time, what they said).
 *   3. Emails you at NOTIFY_EMAIL the moment a reply comes in, with a running total.
 *   4. Flags "unsubscribe" replies so you never email those people again.
 *   5. Sends the personalized replies you write in the sheet. Nothing is sent until you
 *      type a reply in "Your reply" AND tick "Approve". Replies go out in the same thread,
 *      from uaplytechnologies@uaply.net.
 *
 * Install: script.google.com > New project > paste this file > Run "setup" once > Allow.
 */

const SUBJECT = 'Quick question about your job search';
const NOTIFY_EMAIL = 'saifsiddiqueep@gmail.com';
const FROM_ALIAS = 'uaplytechnologies@uaply.net';
const OWN_ADDRESSES = ['uaplytechnologies@uaply.net', 'uaplytechnologies@gmail.com'];
const SENT_TOTAL = 34;                       // early-access emails sent on Oct 15, 2026
const LABEL = 'UAply/Replies';
const HEADERS = ['Received', 'Name', 'Email', 'What they said', 'Unsubscribe?', 'Open in Gmail',
                 'Your reply', 'Approve', 'Status', 'Thread ID', 'Message ID'];
const COL = Object.fromEntries(HEADERS.map((h, i) => [h, i + 1]));

function setup() {
  const props = PropertiesService.getScriptProperties();
  let ss;
  const id = props.getProperty('SHEET_ID');
  if (id) ss = SpreadsheetApp.openById(id);
  else {
    ss = SpreadsheetApp.create('UAply Reply Tracker');
    props.setProperty('SHEET_ID', ss.getId());
  }
  const sh = ss.getSheets()[0];
  sh.setName('Replies');
  sh.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight('bold').setBackground('#f3e3e8');
  sh.setFrozenRows(1);
  sh.getRange(2, COL['Approve'], 999, 1).insertCheckboxes();
  sh.setColumnWidth(COL['What they said'], 380);
  sh.setColumnWidth(COL['Your reply'], 380);
  sh.hideColumns(COL['Thread ID'], 2);

  let sum = ss.getSheetByName('Summary') || ss.insertSheet('Summary');
  sum.getRange('A1:B6').setValues([
    ['Early-access emails sent', SENT_TOTAL],
    ['Replies received', '=COUNTA(Replies!C2:C)'],
    ['People who replied', '=COUNTUNIQUE(Replies!C2:C)'],
    ['Unsubscribes', '=COUNTIF(Replies!E2:E,"YES")'],
    ['Your replies sent', '=COUNTIF(Replies!I2:I,"Sent*")'],
    ['Waiting for your reply', '=COUNTIFS(Replies!C2:C,"<>",Replies!E2:E,"<>YES",Replies!I2:I,"")'],
  ]);
  sum.getRange('A1:A6').setFontWeight('bold');
  sum.setColumnWidth(1, 220);

  GmailApp.getUserLabelByName(LABEL) || GmailApp.createLabel(LABEL);
  ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === 'run').forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('run').timeBased().everyMinutes(5).create();
  run();
  Logger.log('Tracker ready: ' + ss.getUrl());
}

function run() {
  checkReplies();
  sendApproved();
}

function sheet_() {
  return SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('SHEET_ID')).getSheetByName('Replies');
}

function checkReplies() {
  const sh = sheet_();
  const last = sh.getLastRow();
  const seen = new Set(last > 1 ? sh.getRange(2, COL['Message ID'], last - 1, 1).getValues().flat() : []);
  const label = GmailApp.getUserLabelByName(LABEL);
  const threads = GmailApp.search('subject:"' + SUBJECT + '" newer_than:60d', 0, 100);
  const fresh = [];
  threads.forEach(th => {
    th.getMessages().forEach(m => {
      const from = m.getFrom();
      const email = (from.match(/<([^>]+)>/) || [null, from])[1].trim().toLowerCase();
      if (OWN_ADDRESSES.includes(email) || seen.has(m.getId())) return;
      const name = from.replace(/<[^>]+>/, '').replace(/"/g, '').trim() || email;
      const said = latestPart_(m.getPlainBody());
      const unsub = /\bunsubscribe\b|\bremove me\b|\bstop\b/i.test(said) ? 'YES' : '';
      const link = 'https://mail.google.com/mail/u/0/#all/' + th.getId();
      sh.appendRow([m.getDate(), name, email, said, unsub, link, '', false, '', th.getId(), m.getId()]);
      fresh.push({ name, email, said, unsub });
      seen.add(m.getId());
    });
    th.addLabel(label);
  });
  if (fresh.length) notify_(fresh, sh);
}

// Only what the person wrote, without the quoted original email underneath.
function latestPart_(body) {
  const cut = body.split(/\r?\nOn .+wrote:\r?\n|\r?\n-{2,}\s*Original Message|\r?\n>/)[0];
  return cut.trim().slice(0, 2000);
}

function notify_(fresh, sh) {
  const total = sh.getLastRow() - 1;
  const lines = fresh.map(f => '- ' + f.name + ' <' + f.email + '>' + (f.unsub ? '  [UNSUBSCRIBE]' : '') + '\n  "' + f.said.slice(0, 300) + '"');
  const url = SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('SHEET_ID')).getUrl();
  MailApp.sendEmail(NOTIFY_EMAIL,
    'UAply: ' + fresh.length + ' new repl' + (fresh.length === 1 ? 'y' : 'ies') + ' (' + total + ' total)',
    lines.join('\n\n') + '\n\nWrite your reply in the tracker and tick Approve to send it:\n' + url);
}

function sendApproved() {
  const sh = sheet_();
  const last = sh.getLastRow();
  if (last < 2) return;
  const rows = sh.getRange(2, 1, last - 1, HEADERS.length).getValues();
  rows.forEach((r, i) => {
    const text = String(r[COL['Your reply'] - 1]).trim();
    if (r[COL['Approve'] - 1] !== true || !text || r[COL['Status'] - 1]) return;
    const row = i + 2;
    if (r[COL['Unsubscribe?'] - 1] === 'YES') { sh.getRange(row, COL['Status']).setValue('Blocked: unsubscribed'); return; }
    try {
      const msg = GmailApp.getMessageById(r[COL['Message ID'] - 1]);
      const html = text.split(/\n{2,}/).map(p => '<p>' + escape_(p).replace(/\n/g, '<br>') + '</p>').join('') +
        '<p>Best,<br>The UAply Team</p><p style="color:#666;font-size:13px">UAply Technologies<br>uaplytechnologies@uaply.net</p>';
      msg.reply(text + '\n\nBest,\nThe UAply Team', { from: FROM_ALIAS, name: 'UAply', htmlBody: html });
      sh.getRange(row, COL['Status']).setValue('Sent ' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'MMM d, h:mm a'));
    } catch (e) {
      sh.getRange(row, COL['Status']).setValue('Error: ' + e.message);
    }
  });
}

function escape_(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
