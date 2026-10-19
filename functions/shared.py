from firebase_admin import firestore as admin_firestore
from firebase_functions import https_fn


def _db():
    return admin_firestore.client()


def _require_auth(req: https_fn.CallableRequest):
    if req.auth is None:
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.UNAUTHENTICATED,
            message="Debes iniciar sesión.",
        )
    return req.auth


def _require_admin(req: https_fn.CallableRequest):
    auth = _require_auth(req)
    if auth.token.get("role") != "admin":
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.PERMISSION_DENIED,
            message="Solo la administración puede realizar esta acción.",
        )
    return auth
