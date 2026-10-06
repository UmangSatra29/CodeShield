import hmac
import base64
import json
import os
import re
import subprocess
import threading
import time
import uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

TOKEN = os.environ["RUNNER_TOKEN"]
IMAGE = os.environ.get("PYTHON_IMAGE", "python:3.12-alpine")
MAX_CASES = 20
MAX_CODE = 50_000
MAX_TEXT = 20_000
MAX_TOTAL_SECONDS = 24
MAX_CASE_SECONDS = 8
NAME_PREFIX = "cs-run-"
RUN_SLOTS = threading.BoundedSemaphore(2)

# Invoke a function-style solution when there is no __main__ block, while
# preserving stdin/stdout behavior for ordinary script submissions.
FUNCTION_WRAPPER = r'''import ast, base64, contextlib, io, json, sys
source = base64.b64decode(sys.argv[1]).decode("utf-8")
tree = ast.parse(source)
has_main = any(
    isinstance(node, ast.If)
    and "__name__" in ast.get_source_segment(source, node.test)
    and "__main__" in ast.get_source_segment(source, node.test)
    for node in tree.body
)
functions = [node.name for node in tree.body if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)) and not node.name.startswith("_")]
if functions and not has_main:
    namespace = {"__name__": "__codeshield_solution__"}
    exec(compile(source, "<student-solution>", "exec"), namespace)
    raw = sys.stdin.read()
    try:
        value = json.loads(raw)
    except Exception:
        try:
            value = ast.literal_eval(raw)
        except Exception:
            value = raw.rstrip("\n")
    fn = namespace[functions[0]]
    output = io.StringIO()
    with contextlib.redirect_stdout(output):
        if isinstance(value, dict):
            result = fn(**value)
        elif isinstance(value, list):
            result = fn(*value)
        else:
            result = fn(value)
    if result is None:
        sys.stdout.write(output.getvalue())
    elif isinstance(result, str):
        sys.stdout.write(result)
    else:
        sys.stdout.write(str(result))
else:
    exec(compile(source, "<student-solution>", "exec"), {"__name__": "__main__"})
'''


def clean(value):
    return str(value).replace("\r\n", "\n").rstrip()


def run_case(code, case, deadline):
    input_data = case.get("input", "")
    expected = case.get("expectedOutput", "")
    if not isinstance(input_data, str) or len(input_data) > MAX_TEXT:
        raise ValueError("Each test input must be a string no longer than 20000 characters")
    if not isinstance(expected, str) or len(expected) > MAX_TEXT:
        raise ValueError("Each expected output must be a string no longer than 20000 characters")
    name = NAME_PREFIX + uuid.uuid4().hex
    remaining = max(0.1, min(MAX_CASE_SECONDS, deadline - time.monotonic()))
    cmd = [
        "docker", "run", "--rm", "-i", "--name", name,
        "--label", "codeshield.runner=true",
        "--network", "none", "--memory", "128m", "--cpus", "0.5",
        "--pids-limit", "32", "--read-only", "--tmpfs", "/tmp:rw,noexec,nosuid,size=16m",
        "--security-opt", "no-new-privileges", "--cap-drop", "ALL",
        "--user", "65534:65534", IMAGE, "python", "-I", "-B", "-c",
        FUNCTION_WRAPPER, base64.b64encode(code.encode("utf-8")).decode("ascii"),
    ]
    try:
        result = subprocess.run(cmd, input=input_data, text=True, capture_output=True, timeout=remaining, check=False)
        actual = clean(result.stdout[:MAX_TEXT])
        stderr = clean(result.stderr[:4000])
        return {"passed": result.returncode == 0 and actual == clean(expected),
                "actual": actual, "expected": clean(expected), "exitCode": result.returncode,
                "stderr": stderr or None}
    except subprocess.TimeoutExpired:
        subprocess.run(["docker", "rm", "-f", name], capture_output=True, timeout=3, check=False)
        return {"passed": False, "actual": "", "expected": clean(expected), "timedOut": True,
                "stderr": "Execution exceeded the per-test time limit."}


class Handler(BaseHTTPRequestHandler):
    server_version = "CodeShieldRunner/1.0"

    def log_message(self, fmt, *args):
        # Avoid logging source code, inputs, tokens, or outputs.
        print("runner request: " + (args[1] if len(args) > 1 else "request"), flush=True)

    def send_json(self, status, data):
        body = json.dumps(data, separators=(",", ":")).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path == "/health":
            return self.send_json(200, {"ok": True})
        self.send_json(404, {"error": "not_found"})

    def do_POST(self):
        slot_acquired = False
        if self.path != "/v1/run":
            return self.send_json(404, {"error": "not_found"})
        supplied = self.headers.get("Authorization", "")
        if not hmac.compare_digest(supplied, "Bearer " + TOKEN):
            return self.send_json(401, {"error": "unauthorized"})
        try:
            size = int(self.headers.get("Content-Length", "0"))
            if size <= 0 or size > 1_000_000:
                return self.send_json(413, {"error": "request_too_large"})
            payload = json.loads(self.rfile.read(size))
            code = payload.get("code")
            cases = payload.get("testCases", [])
            if payload.get("language", "python").lower() not in ("python", "python3", "python 3"):
                return self.send_json(400, {"error": "unsupported_language", "message": "Only Python is enabled in this runner."})
            if not isinstance(code, str) or not code or len(code) > MAX_CODE:
                return self.send_json(400, {"error": "invalid_code", "message": "Code must contain 1 to 50000 characters."})
            if not isinstance(cases, list) or len(cases) > MAX_CASES:
                return self.send_json(400, {"error": "invalid_test_cases", "message": "A run may contain at most 20 test cases."})
            if not RUN_SLOTS.acquire(blocking=False):
                return self.send_json(429, {"error": "runner_busy", "message": "The local runner is busy. Try again shortly."})
            slot_acquired = True
            deadline = time.monotonic() + MAX_TOTAL_SECONDS
            results = []
            for index, case in enumerate(cases):
                if not isinstance(case, dict):
                    raise ValueError("Each test case must be an object")
                if time.monotonic() >= deadline:
                    results.append({"passed": False, "actual": "", "expected": clean(case.get("expectedOutput", "")),
                                    "timedOut": True, "stderr": "The run exceeded its total time limit."})
                else:
                    results.append(run_case(code, case, deadline))
            passed = sum(1 for item in results if item["passed"])
            self.send_json(200, {"results": [{"testCase": i + 1, **item} for i, item in enumerate(results)],
                                 "passed": passed, "total": len(results), "success": passed == len(results)})
            RUN_SLOTS.release()
            slot_acquired = False
        except (ValueError, TypeError, json.JSONDecodeError) as error:
            if slot_acquired:
                RUN_SLOTS.release()
            self.send_json(400, {"error": "invalid_request", "message": str(error)[:300]})
        except Exception:
            if slot_acquired:
                RUN_SLOTS.release()
            self.send_json(500, {"error": "runner_error", "message": "The isolated code runner could not complete the request."})


if __name__ == "__main__":
    # Pre-pull the execution image at startup so the first student run avoids download latency.
    pulled = subprocess.run(["docker", "pull", IMAGE], capture_output=True, text=True, timeout=180, check=False)
    if pulled.returncode:
        raise SystemExit("Could not pull the Python sandbox image. Check Docker Desktop and network access.")
    port = int(os.environ.get("PORT", "8000"))
    ThreadingHTTPServer(("0.0.0.0", port), Handler).serve_forever()
