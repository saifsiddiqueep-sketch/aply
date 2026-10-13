"""A stand-in mail server for tests: accepts any message over real SMTP and writes it to a file. Nothing leaves this computer.
  python tools/fake-smtp.py [port] [file]      (default 2525, ./data/fake-smtp.jsonl)
Point UAply at it with:  "smtp": {"host": "127.0.0.1", "port": 2525, "starttls": false, "from_addr": "uaply@example.com"}"""
import json
import socketserver
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 2525
OUT = sys.argv[2] if len(sys.argv) > 2 else "data/fake-smtp.jsonl"


class H(socketserver.StreamRequestHandler):
    def reply(self, line):
        self.wfile.write((line + "\r\n").encode())

    def handle(self):
        self.reply("220 fake ESMTP ready")
        frm, rcpt = "", []
        while True:
            line = self.rfile.readline()
            if not line:
                return
            cmd = line.decode("utf-8", "replace").strip()
            up = cmd.upper()
            if up.startswith(("EHLO", "HELO")):
                self.reply("250 fake")
            elif up.startswith("MAIL FROM"):
                frm, rcpt = cmd[10:].strip(" <>"), []
                self.reply("250 ok")
            elif up.startswith("RCPT TO"):
                rcpt.append(cmd[8:].strip(" <>"))
                self.reply("250 ok")
            elif up == "DATA":
                self.reply("354 end with <CRLF>.<CRLF>")
                body = []
                while True:
                    ln = self.rfile.readline().decode("utf-8", "replace")
                    if ln in (".\r\n", ".\n", ""):
                        break
                    body.append(ln[1:] if ln.startswith("..") else ln)
                with open(OUT, "a", encoding="utf-8") as f:
                    f.write(json.dumps({"from": frm, "to": rcpt, "raw": "".join(body)}) + "\n")
                self.reply("250 queued")
            elif up == "QUIT":
                self.reply("221 bye")
                return
            else:
                self.reply("250 ok")


class S(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True


import os
os.makedirs(os.path.dirname(OUT) or ".", exist_ok=True)
S(("127.0.0.1", PORT), H).serve_forever()
