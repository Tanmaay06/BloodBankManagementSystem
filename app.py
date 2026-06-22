from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from datetime import datetime
import os
import requests as http_requests
from dotenv import load_dotenv

load_dotenv()  # Load .env variables (FIREBASE_API_KEY, SECRET_KEY, etc.)

# Absolute path so Vercel's serverless runtime finds static files correctly
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

try:
    from db import get_db, get_auth
    from google.cloud.firestore_v1.base_query import FieldFilter
    _firebase_error = None
except Exception as _e:
    _firebase_error = str(_e)
    get_db = get_auth = FieldFilter = None  # will surface as 503 on first use

app = Flask(__name__, static_folder=os.path.join(BASE_DIR, "static"), static_url_path="")
app.secret_key = os.environ.get("SECRET_KEY", "dev-insecure-key-change-in-prod")
CORS(app)

# Firebase Web API Key — required for the REST sign-in endpoint
FIREBASE_API_KEY = os.environ.get("FIREBASE_API_KEY", "")


def _require_firebase():
    """Return (db, None) or (None, error_response) if Firebase failed to init."""
    if _firebase_error:
        return None, (jsonify({"error": "Firebase init failed", "detail": _firebase_error}), 503)
    return get_db(), None


def _make_email(username: str) -> str:
    """Convert a plain username to a deterministic Firebase Auth email."""
    return f"{username}@bloodbank.app"


# ══════════════════════════════════════════════════════════════════════════════
# HEALTH CHECK — use this to diagnose Vercel startup issues
# ══════════════════════════════════════════════════════════════════════════════

@app.route("/favicon.ico")
def favicon():
    """Prevent 500 errors from browsers requesting a missing favicon."""
    return "", 204


@app.route("/api/health", methods=["GET"])
def health():
    if _firebase_error:
        return jsonify({"status": "error", "firebase": _firebase_error}), 503
    try:
        db = get_db()
        db.collection("_health").document("ping").set({"ok": True})
        return jsonify({"status": "ok", "firebase": "connected"}), 200
    except Exception as e:
        return jsonify({"status": "error", "firebase": str(e)}), 503


# ══════════════════════════════════════════════════════════════════════════════
# AUTHENTICATION
# ══════════════════════════════════════════════════════════════════════════════


@app.route("/api/signup", methods=["POST"])
def signup():
    data = request.get_json()
    username = data.get("username")
    password = data.get("password")
    role = data.get("role", "Donor")

    if not username or not password:
        return jsonify({"error": "Username and password are required"}), 400
    if role not in ("admin", "Donor", "Recipient"):
        return jsonify({"error": "Invalid role"}), 400

    auth = get_auth()
    db = get_db()
    email = _make_email(username)

    try:
        # Create the user in Firebase Authentication
        user = auth.create_user(email=email, password=password, display_name=username)
        uid = user.uid

        # Store the role & metadata in Firestore
        db.collection("users").document(uid).set({
            "username": username,
            "role": role,
            "created_at": datetime.utcnow().isoformat()
        })

        # Auto-create a profile document in the matching collection
        if role == "Donor":
            existing = list(db.collection("donors").where(filter=FieldFilter("name", "==", username)).limit(1).get())
            if not existing:
                db.collection("donors").add({
                    "name": username,
                    "blood_type": "A+",
                    "contact_no": "",
                    "address": "",
                    "Age": 18
                })
        elif role == "Recipient":
            existing = list(db.collection("recipients").where(filter=FieldFilter("name", "==", username)).limit(1).get())
            if not existing:
                db.collection("recipients").add({
                    "name": username,
                    "blood_type": "A+",
                    "contact_no": "",
                    "address": "",
                    "created_at": datetime.utcnow().isoformat()
                })

        return jsonify({"message": "User created successfully", "role": role}), 201

    except Exception as e:
        error_msg = str(e)
        if "EMAIL_EXISTS" in error_msg or "already exists" in error_msg.lower():
            return jsonify({"error": "Username already exists or database error"}), 400
        return jsonify({"error": "Username already exists or database error"}), 400


@app.route("/api/login", methods=["POST"])
def login():
    data = request.get_json()
    username = data.get("username")
    password = data.get("password")
    role = data.get("role")

    if not username or not password or not role:
        return jsonify({"error": "Username, password and role are required"}), 400

    email = _make_email(username)

    # Sign in via Firebase Auth REST API (Admin SDK cannot verify passwords)
    try:
        resp = http_requests.post(
            f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={FIREBASE_API_KEY}",
            json={"email": email, "password": password, "returnSecureToken": True},
            timeout=10
        )
        resp_data = resp.json()
        if resp.status_code != 200:
            return jsonify({"error": "Invalid credentials"}), 401
        uid = resp_data.get("localId")
    except Exception as e:
        return jsonify({"error": f"Auth service error: {str(e)}"}), 500

    # Verify the role stored in Firestore matches the requested role
    db = get_db()
    user_doc = db.collection("users").document(uid).get()
    if not user_doc.exists:
        return jsonify({"error": "Invalid credentials"}), 401

    user_data = user_doc.to_dict()
    if user_data.get("role") != role:
        return jsonify({"error": "Invalid credentials"}), 401

    return jsonify({"message": "Login successful", "username": username, "role": role}), 200


# ══════════════════════════════════════════════════════════════════════════════
# DASHBOARD
# ══════════════════════════════════════════════════════════════════════════════

@app.route("/api/dashboard", methods=["GET"])
def dashboard():
    db = get_db()

    # Donors
    donors = [{"donor_id": d.id, **d.to_dict()} for d in db.collection("donors").stream()]
    total_donors = len(donors)

    # Donations
    donations = [{"donation_id": d.id, **d.to_dict()} for d in db.collection("donations").stream()]
    total_donations = len(donations)
    total_units = float(sum(don.get("quantity", 0) for don in donations))

    # Pending requests
    pending_docs = db.collection("requests").where(filter=FieldFilter("status", "==", "PENDING")).get()
    pending_requests = len(list(pending_docs))

    # Blood-type distribution (from donors)
    blood_type_dist = {}
    for d in donors:
        bt = d.get("blood_type", "Unknown")
        blood_type_dist[bt] = blood_type_dist.get(bt, 0) + 1
    blood_type_dist_list = [
        {"blood_type": k, "count": v}
        for k, v in sorted(blood_type_dist.items())
    ]

    # Recent donations (last 5, sorted by date descending)
    recent_sorted = sorted(donations, key=lambda x: x.get("donation_date", ""), reverse=True)[:5]
    recent_donations = [
        {
            "name": d.get("donor_name", ""),
            "donation_date": d.get("donation_date", ""),
            "quantity": d.get("quantity", 1)
        }
        for d in recent_sorted
    ]

    # Blood inventory — aggregate by blood_type
    inventory_map = {}
    for d in donors:
        bt = d.get("blood_type", "Unknown")
        if bt not in inventory_map:
            inventory_map[bt] = {"donor_ids": set(), "total_units": 0.0, "donation_count": 0}
        inventory_map[bt]["donor_ids"].add(d["donor_id"])

    for don in donations:
        bt = don.get("blood_type", "Unknown")
        if bt not in inventory_map:
            inventory_map[bt] = {"donor_ids": set(), "total_units": 0.0, "donation_count": 0}
        inventory_map[bt]["total_units"] += float(don.get("quantity", 0))
        inventory_map[bt]["donation_count"] += 1

    blood_inventory = [
        {
            "blood_type": bt,
            "donor_count": len(data["donor_ids"]),
            "donation_count": data["donation_count"],
            "total_units": data["total_units"]
        }
        for bt, data in sorted(inventory_map.items())
    ]

    return jsonify({
        "total_donors": total_donors,
        "total_donations": total_donations,
        "total_units": total_units,
        "pending_requests": pending_requests,
        "blood_type_distribution": blood_type_dist_list,
        "recent_donations": recent_donations,
        "blood_inventory": blood_inventory
    })


# ══════════════════════════════════════════════════════════════════════════════
# DONORS
# ══════════════════════════════════════════════════════════════════════════════

@app.route("/api/donors", methods=["GET"])
def get_donors():
    from urllib.parse import unquote
    # Preserve + signs in blood types (URL encoding quirk)
    raw = request.environ.get('QUERY_STRING', '')
    search = ""
    for part in raw.split('&'):
        if part.startswith('search='):
            val = part[7:]
            search = unquote(val.replace('%2B', '+')).strip()
            break
    if not search:
        search = request.args.get("search", "").strip()
    age_min = request.args.get("age_min", "").strip()
    age_max = request.args.get("age_max", "").strip()

    db = get_db()
    donors = [{"donor_id": d.id, **d.to_dict()} for d in db.collection("donors").stream()]

    # Client-side filtering (Firestore doesn't support ILIKE / full-text search)
    if search:
        s_upper = search.upper()
        blood_types = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]
        if s_upper in blood_types:
            donors = [d for d in donors if d.get("blood_type", "").upper() == s_upper]
        else:
            s_lower = search.lower()
            donors = [d for d in donors if (
                s_lower in str(d.get("name", "")).lower() or
                s_lower in str(d.get("contact_no", "")).lower() or
                s_lower in str(d.get("address", "")).lower() or
                s_lower in str(d.get("donor_id", "")).lower() or
                s_upper in str(d.get("blood_type", "")).upper()
            )]

    if age_min:
        try:
            donors = [d for d in donors
                      if d.get("Age") is not None and int(d.get("Age", 0)) >= int(age_min)]
        except ValueError:
            pass
    if age_max:
        try:
            donors = [d for d in donors
                      if d.get("Age") is not None and int(d.get("Age", 0)) <= int(age_max)]
        except ValueError:
            pass

    donors = sorted(donors, key=lambda d: d.get("donor_id", ""), reverse=True)
    return jsonify(donors)


@app.route("/api/donors/<donor_id>", methods=["GET"])
def get_donor(donor_id):
    db = get_db()
    doc = db.collection("donors").document(donor_id).get()
    if not doc.exists:
        return jsonify({"error": "Donor not found"}), 404

    donor = {"donor_id": doc.id, **doc.to_dict()}
    donations_docs = db.collection("donations").where(filter=FieldFilter("donor_id", "==", donor_id)).get()
    donations = [{"donation_id": d.id, **d.to_dict()} for d in donations_docs]
    donations = sorted(donations, key=lambda x: x.get("donation_date", ""), reverse=True)
    donor["donations"] = donations
    return jsonify(donor)


@app.route("/api/donors", methods=["POST"])
def add_donor():
    data = request.get_json()
    if not data.get("name") or not data.get("blood_type"):
        return jsonify({"error": "name and blood_type are required"}), 400

    db = get_db()
    _, doc_ref = db.collection("donors").add({
        "name": data["name"],
        "blood_type": data["blood_type"],
        "contact_no": data.get("contact_no", ""),
        "address": data.get("address", ""),
        "Age": data.get("Age")
    })
    return jsonify({"id": doc_ref.id, "message": "Donor added"}), 201


@app.route("/api/donors/<donor_id>", methods=["PUT"])
def update_donor(donor_id):
    data = request.get_json()
    age_val = data.get("Age")
    if age_val == "":
        age_val = None

    db = get_db()
    doc_ref = db.collection("donors").document(donor_id)
    if not doc_ref.get().exists:
        return jsonify({"error": "Donor not found"}), 404

    try:
        doc_ref.update({
            "name": data.get("name"),
            "blood_type": data.get("blood_type"),
            "contact_no": data.get("contact_no", ""),
            "address": data.get("address", ""),
            "Age": age_val
        })
        return jsonify({"message": "Donor updated"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/donors/<donor_id>", methods=["DELETE"])
def delete_donor(donor_id):
    db = get_db()
    doc_ref = db.collection("donors").document(donor_id)
    if not doc_ref.get().exists:
        return jsonify({"error": "Donor not found"}), 404
    doc_ref.delete()
    # Cascade: remove all donations belonging to this donor
    for don in db.collection("donations").where(filter=FieldFilter("donor_id", "==", donor_id)).get():
        don.reference.delete()
    return jsonify({"message": "Donor deleted"})


# ══════════════════════════════════════════════════════════════════════════════
# DONATIONS
# ══════════════════════════════════════════════════════════════════════════════

@app.route("/api/donations", methods=["GET"])
def get_donations():
    donor_id = request.args.get("donor_id")
    db = get_db()

    if donor_id:
        docs = db.collection("donations").where(filter=FieldFilter("donor_id", "==", donor_id)).get()
    else:
        docs = db.collection("donations").stream()

    donations = [{"donation_id": d.id, **d.to_dict()} for d in docs]
    donations = sorted(donations, key=lambda x: x.get("donation_date", ""), reverse=True)
    return jsonify(donations)


@app.route("/api/donations", methods=["POST"])
def add_donation():
    data = request.get_json()
    if not data.get("donor_id") or not data.get("donation_date"):
        return jsonify({"error": "donor_id and donation_date are required"}), 400

    db = get_db()
    donor_id = data["donor_id"]

    # Denormalize donor info so dashboard/inventory queries need fewer reads
    donor_name = ""
    blood_type = ""
    donor_doc = db.collection("donors").document(donor_id).get()
    if donor_doc.exists:
        donor_data = donor_doc.to_dict()
        donor_name = donor_data.get("name", "")
        blood_type = donor_data.get("blood_type", "")

    _, doc_ref = db.collection("donations").add({
        "donor_id": donor_id,
        "donor_name": donor_name,
        "blood_type": blood_type,
        "donation_date": data["donation_date"],
        "quantity": data.get("quantity", 1)
    })
    return jsonify({"id": doc_ref.id, "message": "Donation recorded"}), 201


@app.route("/api/donations/<donation_id>", methods=["DELETE"])
def delete_donation(donation_id):
    db = get_db()
    doc_ref = db.collection("donations").document(donation_id)
    if not doc_ref.get().exists:
        return jsonify({"error": "Not found"}), 404
    doc_ref.delete()
    return jsonify({"message": "Deleted"})


# ══════════════════════════════════════════════════════════════════════════════
# INVENTORY
# ══════════════════════════════════════════════════════════════════════════════

@app.route("/api/inventory", methods=["GET"])
def get_inventory():
    db = get_db()
    donors = [{"donor_id": d.id, **d.to_dict()} for d in db.collection("donors").stream()]
    donations = [{"donation_id": d.id, **d.to_dict()} for d in db.collection("donations").stream()]

    inventory_map = {}
    for donor in donors:
        bt = donor.get("blood_type", "Unknown")
        if bt not in inventory_map:
            inventory_map[bt] = {"blood_type": bt, "donor_count": 0, "donation_count": 0, "total_units": 0.0}
        inventory_map[bt]["donor_count"] += 1

    for don in donations:
        bt = don.get("blood_type", "Unknown")
        if bt not in inventory_map:
            inventory_map[bt] = {"blood_type": bt, "donor_count": 0, "donation_count": 0, "total_units": 0.0}
        inventory_map[bt]["donation_count"] += 1
        inventory_map[bt]["total_units"] += float(don.get("quantity", 0))

    inventory = sorted(inventory_map.values(), key=lambda x: x["blood_type"])
    return jsonify(inventory)


# ══════════════════════════════════════════════════════════════════════════════
# RECIPIENTS
# ══════════════════════════════════════════════════════════════════════════════

@app.route("/api/recipients", methods=["GET"])
def get_recipients():
    from urllib.parse import unquote
    raw = request.environ.get('QUERY_STRING', '')
    search = ""
    for part in raw.split('&'):
        if part.startswith('search='):
            val = part[7:]
            search = unquote(val.replace('%2B', '+')).strip()
            break
    if not search:
        search = request.args.get("search", "").strip()

    db = get_db()
    recipients = [{"recipient_id": d.id, **d.to_dict()} for d in db.collection("recipients").stream()]

    if search:
        s_upper = search.upper()
        blood_types = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]
        if s_upper in blood_types:
            recipients = [r for r in recipients if r.get("blood_type", "").upper() == s_upper]
        else:
            s_lower = search.lower()
            recipients = [r for r in recipients if (
                s_lower in str(r.get("name", "")).lower() or
                s_lower in str(r.get("contact_no", "")).lower() or
                s_lower in str(r.get("address", "")).lower() or
                s_lower in str(r.get("recipient_id", "")).lower() or
                s_upper in str(r.get("blood_type", "")).upper()
            )]

    recipients = sorted(recipients, key=lambda r: r.get("recipient_id", ""), reverse=True)
    for r in recipients:
        r["contact_no"] = r.get("contact_no", "")
    return jsonify(recipients)


@app.route("/api/recipients", methods=["POST"])
def add_recipient():
    data = request.get_json()
    if not data.get("name") or not data.get("blood_type"):
        return jsonify({"error": "name and blood_type are required"}), 400

    db = get_db()
    _, doc_ref = db.collection("recipients").add({
        "name": data["name"],
        "blood_type": data["blood_type"],
        "contact_no": data.get("contact_no", ""),
        "address": data.get("address", ""),
        "created_at": datetime.utcnow().isoformat()
    })
    return jsonify({"id": doc_ref.id, "message": "Recipient added"}), 201


@app.route("/api/recipients/<recipient_id>", methods=["PUT"])
def update_recipient(recipient_id):
    data = request.get_json()
    db = get_db()
    doc_ref = db.collection("recipients").document(recipient_id)
    if not doc_ref.get().exists:
        return jsonify({"error": "Not found"}), 404
    doc_ref.update({
        "name": data.get("name"),
        "blood_type": data.get("blood_type"),
        "contact_no": data.get("contact_no", ""),
        "address": data.get("address", "")
    })
    return jsonify({"message": "Recipient updated"})


@app.route("/api/recipients/<recipient_id>", methods=["DELETE"])
def delete_recipient(recipient_id):
    db = get_db()
    doc_ref = db.collection("recipients").document(recipient_id)
    if not doc_ref.get().exists:
        return jsonify({"error": "Not found"}), 404
    doc_ref.delete()
    return jsonify({"message": "Recipient deleted"})


# ══════════════════════════════════════════════════════════════════════════════
# REQUESTS — status stored uppercase internally, returned title-cased
# ══════════════════════════════════════════════════════════════════════════════

@app.route("/api/requests", methods=["GET"])
def get_requests():
    db = get_db()
    rows = []
    for doc in db.collection("requests").stream():
        r = {"request_id": doc.id, **doc.to_dict()}
        # Normalize status capitalisation for frontend badges
        status_map = {"PENDING": "Pending", "APPROVED": "Approved", "FULFILLED": "Fulfilled"}
        r["status"] = status_map.get(r.get("status", "").upper(), r.get("status", ""))
        rows.append(r)
    rows = sorted(rows, key=lambda x: x.get("request_id", ""), reverse=True)
    return jsonify(rows)


@app.route("/api/requests", methods=["POST"])
def add_request():
    data = request.get_json()
    if not data.get("recipient_id") or not data.get("blood_type") or not data.get("request_date"):
        return jsonify({"error": "recipient_id, blood_type and request_date are required"}), 400

    db = get_db()
    recipient_id = data["recipient_id"]

    # Denormalize recipient name for query-free list views
    recipient_name = ""
    rec_doc = db.collection("recipients").document(recipient_id).get()
    if rec_doc.exists:
        recipient_name = rec_doc.to_dict().get("name", "")

    _, doc_ref = db.collection("requests").add({
        "recipient_id": recipient_id,
        "recipient_name": recipient_name,
        "blood_type": data["blood_type"],
        "request_date": data["request_date"],
        "contact_no": data.get("contact_no", ""),
        "status": "PENDING",
        "created_at": datetime.utcnow().isoformat()
    })
    return jsonify({"id": doc_ref.id, "message": "Request created"}), 201


@app.route("/api/requests/<request_id>/status", methods=["PUT"])
def update_request_status(request_id):
    data = request.get_json()
    status = data.get("status", "").upper()
    if status not in ("PENDING", "APPROVED", "FULFILLED"):
        return jsonify({"error": "Invalid status"}), 400

    db = get_db()
    doc_ref = db.collection("requests").document(request_id)
    if not doc_ref.get().exists:
        return jsonify({"error": "Not found"}), 404
    doc_ref.update({"status": status})
    return jsonify({"message": f"Status updated to {status}"})


@app.route("/api/requests/<request_id>", methods=["DELETE"])
def delete_request(request_id):
    db = get_db()
    doc_ref = db.collection("requests").document(request_id)
    if not doc_ref.get().exists:
        return jsonify({"error": "Not found"}), 404
    doc_ref.delete()
    return jsonify({"message": "Request deleted"})


# ══════════════════════════════════════════════════════════════════════════════
# SERVE FRONTEND — must be LAST
# ══════════════════════════════════════════════════════════════════════════════

@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve(path):
    if path and os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    return send_from_directory(app.static_folder, "index.html")


if __name__ == "__main__":
    app.run(debug=True, port=5000)
