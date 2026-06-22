"""
donor_service.py — Firebase Firestore donor helper functions.

Provides convenience wrappers around the Firestore 'donors', 'donations',
and 'requests' collections.  Used for scripting / CLI tasks; the Flask API
(app.py) calls Firestore directly for finer control.
"""

from db import get_db
from google.cloud.firestore_v1.base_query import FieldFilter
from datetime import date, timedelta


# ──────────────────────────────────────────────────────────────────────────────
# DONORS
# ──────────────────────────────────────────────────────────────────────────────

def add_donor(name, age, blood_type, contact_no, address):
    db = get_db()
    _, doc_ref = db.collection("donors").add({
        "name": name,
        "Age": age,
        "blood_type": blood_type,
        "contact_no": contact_no,
        "address": address,
    })
    return doc_ref.id


def get_all_donors():
    db = get_db()
    return [{"donor_id": d.id, **d.to_dict()} for d in db.collection("donors").stream()]


def search_by_blood(blood_type):
    db = get_db()
    docs = db.collection("donors").where(filter=FieldFilter("blood_type", "==", blood_type)).get()
    return [{"donor_id": d.id, **d.to_dict()} for d in docs]


def delete_donor(donor_id):
    db = get_db()
    db.collection("donors").document(donor_id).delete()
    # Cascade: remove all donations for this donor
    for don in db.collection("donations").where(filter=FieldFilter("donor_id", "==", donor_id)).get():
        don.reference.delete()


def update_donor(donor_id, name, age, blood_type, contact_no, address):
    db = get_db()
    db.collection("donors").document(donor_id).update({
        "name": name,
        "Age": age,
        "blood_type": blood_type,
        "contact_no": contact_no,
        "address": address,
    })


# ──────────────────────────────────────────────────────────────────────────────
# DONATIONS
# ──────────────────────────────────────────────────────────────────────────────

def add_donation(donor_id, blood_type, quantity):
    db = get_db()

    # Verify donor exists
    donor_doc = db.collection("donors").document(donor_id).get()
    if not donor_doc.exists:
        print("❌ Invalid donor ID! Donation cancelled.")
        return None

    donor_name = donor_doc.to_dict().get("name", "")
    today = date.today().isoformat()

    _, doc_ref = db.collection("donations").add({
        "donor_id": donor_id,
        "donor_name": donor_name,
        "blood_type": blood_type,
        "donation_date": today,
        "quantity": quantity,
        "expiry_date": (date.today() + timedelta(days=42)).isoformat(),
    })
    print("✅ Donation added successfully")
    return doc_ref.id


# ──────────────────────────────────────────────────────────────────────────────
# REQUESTS
# ──────────────────────────────────────────────────────────────────────────────

def create_request(recipient_id, blood_type, contact_no):
    db = get_db()
    recipient_name = ""
    rec_doc = db.collection("recipients").document(recipient_id).get()
    if rec_doc.exists:
        recipient_name = rec_doc.to_dict().get("name", "")

    _, doc_ref = db.collection("requests").add({
        "recipient_id": recipient_id,
        "recipient_name": recipient_name,
        "blood_type": blood_type,
        "request_date": date.today().isoformat(),
        "contact_no": contact_no,
        "status": "PENDING",
    })
    return doc_ref.id


def get_requests():
    db = get_db()
    return [{"request_id": d.id, **d.to_dict()} for d in db.collection("requests").stream()]


def fulfill_request(request_id):
    db = get_db()
    req_doc = db.collection("requests").document(request_id).get()
    if not req_doc.exists:
        print("❌ Request not found")
        return
    db.collection("requests").document(request_id).update({"status": "APPROVED"})
    print("✅ Request approved")


# ──────────────────────────────────────────────────────────────────────────────
# DASHBOARD
# ──────────────────────────────────────────────────────────────────────────────

def dashboard_data():
    db = get_db()
    donors = list(db.collection("donors").stream())
    total_donors = len(donors)

    donations = [d.to_dict() for d in db.collection("donations").stream()]

    stock = {}
    for don in donations:
        bt = don.get("blood_type", "Unknown")
        stock[bt] = stock.get(bt, 0) + don.get("quantity", 0)

    stock_list = [{"blood_type": bt, "units": units} for bt, units in sorted(stock.items())]
    return total_donors, stock_list
