import unittest
from datetime import date

from firebase_functions import https_fn
from functions.main import (
    CURRENT_INSTRUMENT_VERSION,
    _DEFAULT_SURVEY_QUESTIONS,
    _current_survey_cycle,
    _is_active_record,
    _normalize_survey_answers,
    _survey_instrument_version,
)


class SurveySubmissionTests(unittest.TestCase):
    def test_missing_active_flag_defaults_to_active(self):
        self.assertTrue(_is_active_record({}))
        self.assertTrue(_is_active_record({"active": True}))
        self.assertFalse(_is_active_record({"active": False}))

    def test_validates_answers_and_normalizes_psychological_safety(self):
        questions = [
            {
                "id": "enps",
                "type": "scale",
                "min": 0,
                "max": 10,
                "mapsTo": "enps",
                "required": True,
            },
            {
                "id": "safety",
                "type": "scale",
                "min": 1,
                "max": 10,
                "mapsTo": "psychosocialFactors.psychSafety",
                "required": True,
            },
            {"id": "comment", "type": "text", "mapsTo": "openText", "required": False},
        ]

        response = _normalize_survey_answers(
            questions,
            {"enps": 9, "safety": 8, "comment": "Buen ambiente"},
        )

        self.assertEqual(response["enps"], 9)
        self.assertEqual(response["psychosocialFactors"]["psychSafety"], 4.1)
        self.assertEqual(response["openText"], "Buen ambiente")

    def test_rejects_missing_required_responses(self):
        with self.assertRaises(https_fn.HttpsError):
            _normalize_survey_answers(
                [{"id": "enps", "type": "scale", "min": 0, "max": 10, "mapsTo": "enps"}],
                {},
            )

    def test_current_cycle_matches_survey_frequency(self):
        current_date = date(2026, 10, 14)
        self.assertEqual(_current_survey_cycle("weekly", current_date), "2026-W42")
        self.assertEqual(_current_survey_cycle("biweekly", current_date), "2026-Q21")
        self.assertEqual(_current_survey_cycle("once", current_date), "unica")

    def test_only_complete_direct_factor_answers_get_current_instrument_version(self):
        answers = {
            "enps": 8,
            "workLifeBalance": 7,
            "cognitiveLoad": "balanced",
            "psych_cognitive_load": 3,
            "psych_role_ambiguity": 2,
            "psych_emotional_labor": 3,
            "psych_shift_fatigue": 4,
            "psych_autonomy": 4,
            "psychSafety": 8,
            "openText": "",
        }
        normalized = _normalize_survey_answers(_DEFAULT_SURVEY_QUESTIONS, answers)

        self.assertEqual(_survey_instrument_version(normalized), CURRENT_INSTRUMENT_VERSION)
        self.assertEqual(_survey_instrument_version({"psychosocialFactors": {"psychSafety": 4}}), 1)


if __name__ == "__main__":
    unittest.main()
