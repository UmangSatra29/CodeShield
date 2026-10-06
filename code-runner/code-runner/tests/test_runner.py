import importlib.util
import os
import pathlib
import subprocess
import unittest
from unittest.mock import patch

os.environ["RUNNER_TOKEN"] = "test-runner-token"
spec = importlib.util.spec_from_file_location("codeshield_runner", pathlib.Path(__file__).parents[1] / "runner.py")
runner = importlib.util.module_from_spec(spec)
spec.loader.exec_module(runner)


class RunnerTests(unittest.TestCase):
    @patch.object(runner.subprocess, "run")
    def test_runs_case_inside_restricted_container_and_compares_output(self, run):
        run.return_value = subprocess.CompletedProcess([], 0, "ok\n", "")
        result = runner.run_case("print(input())", {"input": "ok", "expectedOutput": "ok"}, 999999999)
        self.assertTrue(result["passed"])
        args, kwargs = run.call_args
        command = args[0]
        self.assertIn("--network", command)
        self.assertIn("none", command)
        self.assertIn("--memory", command)
        self.assertIn("128m", command)
        self.assertEqual(kwargs["input"], "ok")
        self.assertEqual(command[-1], "print(input())")

    @patch.object(runner.subprocess, "run")
    def test_reports_wrong_answer(self, run):
        run.return_value = subprocess.CompletedProcess([], 0, "wrong", "")
        result = runner.run_case("print('wrong')", {"input": "", "expectedOutput": "right"}, 999999999)
        self.assertFalse(result["passed"])

    def test_rejects_oversized_test_input(self):
        with self.assertRaises(ValueError):
            runner.run_case("pass", {"input": "x" * (runner.MAX_TEXT + 1), "expectedOutput": ""}, 999999999)


if __name__ == "__main__":
    unittest.main()
