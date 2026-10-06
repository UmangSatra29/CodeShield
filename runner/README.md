# Isolated Python runner

The runner accepts source code and visible test inputs from the API and starts a fresh Docker container for each test execution. Build the image once with:

```sh
docker build -t codeshield-python-runner ./runner
```

Run the service only on a private network reachable by the API. Configure the same random `RUNNER_KEY` in API and runner environments. The container has no network, capped memory/CPU/processes, read-only filesystem except its temporary work mount, dropped Linux capabilities, and a 3-second per-test timeout. Add an OS-level seccomp/AppArmor profile and rootless Docker in production. Do not expose the runner directly to the public internet.

The example protocol expects each test input on stdin and compares stdout to the configured expected output. A production judge should use language-specific adapters and invoke the student's requested function using a generated harness, with strict output normalization.
