import firebase_admin
from firebase_admin import credentials, firestore, auth as firebase_auth
import os
import json


def _init_firebase():
    """Initialize Firebase Admin SDK (idempotent).

    Priority order for credentials:
    1. FIREBASE_CREDENTIALS_JSON env var  → used on Vercel / any serverless host
    2. File at FIREBASE_CREDENTIALS_PATH  → used locally (defaults to firebase_credentials.json)
    """
    if firebase_admin._apps:
        return  # Already initialized

    json_str = os.environ.get("FIREBASE_CREDENTIALS_JSON", "").strip()

    if json_str:
        # Serverless / Vercel: full JSON stored as env var
        cred_dict = json.loads(json_str)
        cred = credentials.Certificate(cred_dict)
    else:
        # Local dev: read from JSON file
        cred_path = os.environ.get(
            "FIREBASE_CREDENTIALS_PATH",
            os.path.join(os.path.dirname(os.path.abspath(__file__)), "firebase_credentials.json")
        )
        if not os.path.exists(cred_path):
            raise FileNotFoundError(
                f"Firebase credentials not found. Set FIREBASE_CREDENTIALS_JSON env var "
                f"(for Vercel/production) or place firebase_credentials.json at: {cred_path}"
            )
        cred = credentials.Certificate(cred_path)

    firebase_admin.initialize_app(cred)


_init_firebase()


def get_db():
    """Returns the Firestore client."""
    return firestore.client()


def get_auth():
    """Returns the Firebase Auth module."""
    return firebase_auth
