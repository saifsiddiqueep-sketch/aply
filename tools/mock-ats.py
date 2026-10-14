"""A stand-in for the application endpoints of Greenhouse and Lever, for tests. It follows their public documentation: Greenhouse checks a Basic-auth key and
serves a posting's questions; Lever checks a key in the address and needs a name and email. Every application it accepts is kept and shown at /__received.
  python tools/mock-ats.py 8795
Greenhouse keys: board 'acme' uses 'gh-secret-key-123'. Lever keys: site 'acme' uses 'lever-key-456'.
Greenhouse job ids choose the scenario: 1001 only the standard fields, 1002 also a work-authorization question and 'how did you hear', 1003 a required question that
no profile can answer, 1004 a job that does not exist, 1005 an employer system that returns an error. Lever posting id 'slow' answers 429."""
import base64
import email
import email.policy
import json
import sys
import urllib.parse
import http.server

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8795
GH_KEY, LEVER_KEY = "gh-secret-key-123", "lever-key-456"
RECEIVED = []


def std(required_phone=False):
    return [
        {"required": True, "label": "First Name", "fields": [{"name": "first_name", "type": "input_text", "values": []}]},
        {"required": True, "label": "Last Name", "fields": [{"name": "last_name", "type": "input_text", "values": []}]},
        {"required": True, "label": "Email", "fields": [{"name": "email", "type": "input_text", "values": []}]},
        {"required": required_phone, "label": "Phone", "fields": [{"name": "phone", "type": "input_text", "values": []}]},
        {"required": True, "label": "Resume/CV", "fields": [{"name": "resume", "type": "input_file", "values": []}, {"name": "resume_text", "type": "textarea", "values": []}]},
        {"required": False, "label": "Cover Letter", "fields": [{"name": "cover_letter", "type": "input_file", "values": []}, {"name": "cover_letter_text", "type": "textarea", "values": []}]},
    ]


def questions_for(job_id):
    q = std()
    if job_id == "1002":
        q += [{"required": False, "label": "LinkedIn Profile", "fields": [{"name": "question_100", "type": "input_text", "values": []}]},
              {"required": True, "label": "Are you legally authorized to work in the United States?",
               "fields": [{"name": "question_101", "type": "multi_value_single_select", "values": [{"label": "Yes", "value": 1}, {"label": "No", "value": 0}]}]},
              {"required": True, "label": "Will you now or in the future require sponsorship for employment visa status?",
               "fields": [{"name": "question_102", "type": "multi_value_single_select", "values": [{"label": "Yes", "value": 1}, {"label": "No", "value": 0}]}]},
              {"required": True, "label": "How did you hear about this job?",
               "fields": [{"name": "question_103", "type": "multi_value_single_select", "values": [{"label": "Employee referral", "value": 7}, {"label": "Job board", "value": 8}, {"label": "Other", "value": 9}]}]},
              {"required": False, "label": "Personal website", "fields": [{"name": "question_104", "type": "input_text", "values": []}]}]
    if job_id == "1003":
        q += [{"required": True, "label": "What is your favorite color and why?", "fields": [{"name": "question_200", "type": "textarea", "values": []}]}]
    return q


def parse_multipart(ctype, body):
    msg = email.message_from_bytes(b"Content-Type: " + ctype.encode() + b"\r\nMIME-Version: 1.0\r\n\r\n" + body, policy=email.policy.default)
    fields, files = {}, {}
    for part in msg.iter_parts():
        name = part.get_param("name", header="content-disposition")
        fn = part.get_filename()
        if fn:
            files[name] = {"filename": fn, "type": part.get_content_type(), "bytes": len(part.get_payload(decode=True) or b"")}
        else:
            fields[name] = part.get_content()
    return fields, files


class H(http.server.BaseHTTPRequestHandler):
    def _json(self, code, obj):
        body = json.dumps(obj).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        u = urllib.parse.urlparse(self.path)
        parts = u.path.strip("/").split("/")
        if u.path == "/__received":
            return self._json(200, RECEIVED)
        if len(parts) == 5 and parts[:2] == ["v1", "boards"] and parts[3] == "jobs":
            job_id = parts[4]
            if job_id == "1004":
                return self._json(404, {"error": "Job not found"})
            return self._json(200, {"id": int(job_id), "title": "Test job", "questions": questions_for(job_id), "location_questions": [], "compliance": [], "demographic_questions": {}})
        return self._json(404, {"error": "not found"})

    def do_POST(self):
        u = urllib.parse.urlparse(self.path)
        parts = u.path.strip("/").split("/")
        n = int(self.headers.get("Content-Length") or 0)
        body = self.rfile.read(n)
        ctype = self.headers.get("Content-Type") or ""
        if len(parts) == 5 and parts[:2] == ["v1", "boards"] and parts[3] == "jobs":
            want = "Basic " + base64.b64encode((GH_KEY + ":").encode()).decode()
            if self.headers.get("Authorization") != want:
                return self._json(401, {"error": "Invalid or missing API key"})
            if parts[4] == "1005":
                return self._json(500, {"error": "The employer's system is having a problem"})
            fields, files = parse_multipart(ctype, body)
            if not fields.get("first_name") or not fields.get("email"):
                return self._json(422, {"error": "first_name and email are required"})
            RECEIVED.append({"system": "greenhouse", "board": parts[2], "job": parts[4], "fields": fields, "files": files})
            return self._json(200, {"success": "Application submitted"})
        if len(parts) == 4 and parts[:2] == ["v0", "postings"]:
            q = urllib.parse.parse_qs(u.query)
            if (q.get("key") or [""])[0] != LEVER_KEY:
                return self._json(401, {"ok": False, "error": "Unauthorized"})
            if parts[3] == "slow":
                return self._json(429, {"ok": False, "error": "Too many requests"})
            fields, files = parse_multipart(ctype, body)
            if not fields.get("name") or "@" not in fields.get("email", ""):
                return self._json(400, {"ok": False, "error": "Missing name or email"})
            RECEIVED.append({"system": "lever", "site": parts[2], "posting": parts[3], "fields": fields, "files": files})
            return self._json(200, {"ok": True, "applicationId": "app-%d" % len(RECEIVED)})
        return self._json(404, {"error": "not found"})

    def log_message(self, *a):
        pass


if __name__ == "__main__":
    http.server.ThreadingHTTPServer(("127.0.0.1", PORT), H).serve_forever()
