import unittest
from types import SimpleNamespace

from firebase_functions import https_fn

from functions.ai_functions import _serialize_ai_input
from functions.main import _require_admin


class AiInputValidationTests(unittest.TestCase):
    def test_serializes_utf8_payload_within_byte_limit(self):
        serialized = _serialize_ai_input({"comentario": "bienestar"}, 100, "análisis")

        self.assertIn("bienestar", serialized)

    def test_rejects_payloads_over_the_byte_limit(self):
        with self.assertRaises(https_fn.HttpsError):
            _serialize_ai_input({"comment": "á" * 30}, 32, "análisis")

    def test_rejects_values_that_cannot_be_encoded_as_json(self):
        with self.assertRaises(https_fn.HttpsError):
            _serialize_ai_input({"comment": object()}, 100, "análisis")

    def test_admin_guard_rejects_unauthenticated_callers(self):
        with self.assertRaises(https_fn.HttpsError):
            _require_admin(SimpleNamespace(auth=None))

    def test_admin_guard_rejects_non_admin_roles(self):
        request = SimpleNamespace(auth=SimpleNamespace(token={"role": "employee"}))

        with self.assertRaises(https_fn.HttpsError):
            _require_admin(request)

    def test_admin_guard_accepts_admins(self):
        auth = SimpleNamespace(token={"role": "admin"})

        self.assertIs(_require_admin(SimpleNamespace(auth=auth)), auth)


if __name__ == "__main__":
    unittest.main()
