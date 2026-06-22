import firebase_admin
from firebase_admin import credentials, firestore, auth as firebase_auth
import os
import json


def _init_firebase():
    """Initialize Firebase Admin SDK (idempotent).

    - Local dev:  reads the JSON key file at FIREBASE_CREDENTIALS_PATH
                  (defaults to 'firebase_credentials.json')
    - Production: reads the entire JSON from FIREBASE_CREDENTIALS_JSON
                  env variable (set in Vercel / any serverless host)
    """
    if firebase_admin._apps:
        return  # Already initialized

    json_str = os.environ.get("FIREBASE_CREDENTIALS_JSON")
    if json_str:
        # Serverless / Vercel path — credentials stored as env var
        cred_dict = json.loads(json_str)
        cred = credentials.Certificate(cred_dict)
    else:
        # Local dev path — credentials stored as a JSON file
        cred_path = os.environ.get("FIREBASE_CREDENTIALS_PATH", "firebase_credentials.json")
        cred = credentials.Certificate(cred_path)

    firebase_admin.initialize_app(cred)


_init_firebase()


def get_db():
    """Returns the Firestore client."""
    return firestore.client()


def get_auth():
    """Returns the Firebase Auth module."""
    return firebase_auth
