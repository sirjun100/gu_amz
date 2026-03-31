"""与 客户端上报日志约定.md 对齐的解析单测（unittest，无额外依赖）。"""

import importlib.util
import sys
import unittest
from pathlib import Path

_ROOT = Path(__file__).resolve().parent.parent
_spec = importlib.util.spec_from_file_location(
    "task_report_parse",
    _ROOT / "src" / "task_report_parse.py",
)
_mod = importlib.util.module_from_spec(_spec)
assert _spec.loader is not None
sys.modules["task_report_parse"] = _mod
_spec.loader.exec_module(_mod)
parse_task_report_footer = _mod.parse_task_report_footer
REPORT_PREFIX = _mod.REPORT_PREFIX


class TestParseTaskReportFooter(unittest.TestCase):
    def test_amz_success(self):
        lines = [
            "a",
            'AMZ_REPORT {"status":"success","environment":"env-a","finished_at":"2026-03-31T08:15:00Z"}',
        ]
        p = parse_task_report_footer(lines)
        self.assertTrue(p.success)
        self.assertEqual(p.environment, "env-a")
        self.assertTrue(p.used_amz_report)
        self.assertIsNotNone(p.finished_at)
        self.assertIsNone(p.failure_detail)

    def test_amz_failed_with_error(self):
        p = parse_task_report_footer(['AMZ_REPORT {"status":"failed","error":"timeout"}'])
        self.assertFalse(p.success)
        self.assertIn("timeout", p.failure_detail or "")

    def test_amz_malformed_json(self):
        p = parse_task_report_footer(["AMZ_REPORT {not json"])
        self.assertFalse(p.success)
        self.assertTrue(p.used_amz_report)
        self.assertIn("解析", p.failure_detail or "")

    def test_legacy_success_last_line(self):
        p = parse_task_report_footer(["x", "  Success  "])
        self.assertTrue(p.success)
        self.assertFalse(p.used_amz_report)

    def test_legacy_failed(self):
        p = parse_task_report_footer(["err line"])
        self.assertFalse(p.success)
        self.assertEqual(p.failure_detail, "err line")

    def test_empty_lines_failed(self):
        p = parse_task_report_footer([])
        self.assertFalse(p.success)

    def test_prefix_constant(self):
        self.assertTrue("REPORT" in REPORT_PREFIX)


if __name__ == "__main__":
    unittest.main()
