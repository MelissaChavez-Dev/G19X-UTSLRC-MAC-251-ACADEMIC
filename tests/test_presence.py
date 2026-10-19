import unittest
from datetime import time

from functions.presence import DEFAULT_WORK_DAYS, _scheduled_days, _work_schedule_bounds


class PresenceScheduleTests(unittest.TestCase):
    def test_missing_schedule_uses_the_same_weekday_default_as_the_ui(self):
        self.assertEqual(_scheduled_days({}), DEFAULT_WORK_DAYS)
        self.assertEqual(_scheduled_days({"days": None}), DEFAULT_WORK_DAYS)

    def test_explicit_empty_schedule_remains_unscheduled(self):
        self.assertEqual(_scheduled_days({"days": []}), [])

    def test_valid_work_hours_are_parsed(self):
        self.assertEqual(
            _work_schedule_bounds({"startTime": "08:30", "endTime": "17:15"}),
            (time(8, 30), time(17, 15)),
        )

    def test_invalid_or_overnight_work_hours_are_not_scheduled(self):
        self.assertIsNone(_work_schedule_bounds({"startTime": "25:00", "endTime": "18:00"}))
        self.assertIsNone(_work_schedule_bounds({"startTime": "19:00", "endTime": "08:00"}))


if __name__ == "__main__":
    unittest.main()
