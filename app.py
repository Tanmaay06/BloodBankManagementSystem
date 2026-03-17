<<<<<<< HEAD
import streamlit as st
import pandas as pd
from donor_service import (
    add_donor,
    get_all_donors,
    delete_donor,
    update_donor,
    dashboard_data
)

st.set_page_config(page_title="Blood Donation System", layout="wide")
st.title("🩸 Blood Donation System")

menu = st.sidebar.radio(
    "Menu",
    ["Dashboard", "Add Donor", "View Donors", "Update Donor"]
)

# ================= DASHBOARD =================
if menu == "Dashboard":
    st.subheader("📊 Dashboard")

    total, blood_stats = dashboard_data()

    col1, col2 = st.columns(2)
    col1.metric("👥 Total Donors", total)

    df_stats = pd.DataFrame(blood_stats)
    df_stats = df_stats.set_index("blood_group")
    col2.bar_chart(df_stats)

# ================= ADD DONOR =================
elif menu == "Add Donor":
    st.subheader("➕ Add Donor")

    name = st.text_input("Name")
    age = st.number_input("Age", 18, 65)
    gender = st.selectbox("Gender", ["Male", "Female", "Other"])
    blood = st.selectbox("Blood Group", ["A+","A-","B+","B-","O+","O-","AB+","AB-"])
    phone = st.text_input("Phone")
    address = st.text_input("Address")

    if st.button("Add Donor"):
        if name and phone:
            add_donor(name, age, gender, blood, phone, address)
            st.success("✅ Donor added successfully")
            st.experimental_rerun()
        else:
            st.error("❌ Name and Phone required")

# ================= VIEW + DELETE =================
elif menu == "View Donors":
    st.subheader("📋 All Donors")

    df = pd.DataFrame(get_all_donors())

    if df.empty:
        st.warning("No donors found")
    else:
        st.dataframe(df, width="stretch")

        st.subheader("🗑 Delete Donor")
        donor_id = st.selectbox("Select Donor ID", df["donor_id"])

        if st.button("Delete Selected Donor"):
            delete_donor(donor_id)
            st.success("✅ Donor deleted")
            st.experimental_rerun()

# ================= UPDATE DONOR =================
elif menu == "Update Donor":
    st.subheader("✏️ Update Donor")

    df = pd.DataFrame(get_all_donors())

    if df.empty:
        st.warning("No donors available")
    else:
        donor_id = st.selectbox("Select Donor ID", df["donor_id"])
        donor = df[df["donor_id"] == donor_id].iloc[0]

        name = st.text_input("Name", donor["name"])
        age = st.number_input("Age", 18, 65, donor["age"])
        gender = st.selectbox(
            "Gender", ["Male", "Female", "Other"],
            index=["Male","Female","Other"].index(donor["gender"])
        )
        blood = st.selectbox(
            "Blood Group",
            ["A+","A-","B+","B-","O+","O-","AB+","AB-"],
            index=["A+","A-","B+","B-","O+","O-","AB+","AB-"].index(donor["blood_group"])
        )
        phone = st.text_input("Phone", donor["phone"])
        address = st.text_input("Address", donor["address"])

        if st.button("Update Donor"):
            update_donor(donor_id, name, age, gender, blood, phone, address)
            st.success("✅ Donor updated")
            st.experimental_rerun()
=======
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from db import get_connection, init_db
from datetime import date
import os

app = Flask(__name__, static_folder="static", static_url_path="")
CORS(app)

with app.app_context():
    try:
        init_db()
    except Exception as e:
        print(f"DB init warning: {e}")


# ══════════════════════════════════════════════════════════════════════════════
# DASHBOARD
# ══════════════════════════════════════════════════════════════════════════════
@app.route("/api/dashboard", methods=["GET"])
def dashboard():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT COUNT(*) AS total_donors FROM donor")
        total_donors = cursor.fetchone()["total_donors"]

        cursor.execute("SELECT COUNT(*) AS total_donations FROM donation")
        total_donations = cursor.fetchone()["total_donations"]

        cursor.execute("SELECT COALESCE(SUM(quatity), 0) AS total_units FROM donation")
        total_units = float(cursor.fetchone()["total_units"])

        cursor.execute("SELECT COUNT(*) AS cnt FROM request WHERE status='PENDING'")
        pending_requests = cursor.fetchone()["cnt"]

        cursor.execute("SELECT blood_type, COUNT(*) AS count FROM donor GROUP BY blood_type ORDER BY blood_type")
        blood_type_dist = cursor.fetchall()

        cursor.execute("""
            SELECT d.name, don.donation_date, don.quatity
            FROM donation don JOIN donor d ON don.donor_id = d.donor_id
            ORDER BY don.donation_date DESC LIMIT 5
        """)
        recent_donations = cursor.fetchall()
        for r in recent_donations:
            if isinstance(r["donation_date"], date):
                r["donation_date"] = r["donation_date"].isoformat()

        cursor.execute("""
            SELECT d.blood_type,
                   COUNT(DISTINCT don.donation_id) AS donation_count,
                   COALESCE(SUM(don.quatity), 0) AS total_units
            FROM donor d LEFT JOIN donation don ON don.donor_id = d.donor_id
            GROUP BY d.blood_type
        """)
        blood_inventory = cursor.fetchall()
        for b in blood_inventory:
            b["total_units"] = float(b["total_units"])

        return jsonify({
            "total_donors": total_donors,
            "total_donations": total_donations,
            "total_units": total_units,
            "pending_requests": pending_requests,
            "blood_type_distribution": blood_type_dist,
            "recent_donations": recent_donations,
            "blood_inventory": blood_inventory
        })
    finally:
        cursor.close()
        conn.close()


# ══════════════════════════════════════════════════════════════════════════════
# DONORS
# ══════════════════════════════════════════════════════════════════════════════
@app.route("/api/donors", methods=["GET"])
def get_donors():
    from urllib.parse import unquote, unquote_plus
    # Read raw query string and decode %2B as + (not space)
    raw = request.environ.get('QUERY_STRING', '')
    search = ""
    for part in raw.split('&'):
        if part.startswith('search='):
            val = part[7:]
            # decode %2B -> + first, then decode everything else
            search = unquote(val.replace('%2B', '+')).strip()
            break
    # Also handle case where frontend sends literal + (decoded as space by Flask)
    # Try request.args as fallback and restore +
    if not search:
        search = request.args.get("search", "").strip()
    age_min = request.args.get("age_min", "").strip()
    age_max = request.args.get("age_max", "").strip()
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        query = "SELECT * FROM donor WHERE 1=1"
        params = []
        if search:
            s_upper = search.upper()
            blood_types = ["A+","A-","B+","B-","AB+","AB-","O+","O-"]
            if s_upper in blood_types:
                # exact blood type match
                query += " AND UPPER(blood_type) = %s"
                params += [s_upper]
            else:
                like = f"%{search}%"
                query += """ AND (
                    name LIKE %s OR
                    contact_no LIKE %s OR
                    address LIKE %s OR
                    CAST(donor_id AS CHAR) LIKE %s OR
                    UPPER(blood_type) LIKE %s
                )"""
                params += [like, like, like, like, f"%{s_upper}%"]
        if age_min:
            query += " AND Age >= %s"
            params += [int(age_min)]
        if age_max:
            query += " AND Age <= %s"
            params += [int(age_max)]
        query += " ORDER BY donor_id DESC"
        cursor.execute(query, params)
        return jsonify(cursor.fetchall())
    finally:
        cursor.close()
        conn.close()


@app.route("/api/donors/<int:donor_id>", methods=["GET"])
def get_donor(donor_id):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM donor WHERE donor_id = %s", (donor_id,))
        donor = cursor.fetchone()
        if not donor:
            return jsonify({"error": "Donor not found"}), 404
        cursor.execute("SELECT * FROM donation WHERE donor_id = %s ORDER BY donation_date DESC", (donor_id,))
        donations = cursor.fetchall()
        for d in donations:
            if isinstance(d.get("donation_date"), date):
                d["donation_date"] = d["donation_date"].isoformat()
        donor["donations"] = donations
        return jsonify(donor)
    finally:
        cursor.close()
        conn.close()


@app.route("/api/donors", methods=["POST"])
def add_donor():
    data = request.get_json()
    if not data.get("name") or not data.get("blood_type"):
        return jsonify({"error": "name and blood_type are required"}), 400
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            INSERT INTO donor (name, blood_type, contact_no, address, Age)
            VALUES (%s, %s, %s, %s, %s)
        """, (data["name"], data["blood_type"], data.get("contact_no"), data.get("address"), data.get("Age")))
        conn.commit()
        return jsonify({"id": cursor.lastrowid, "message": "Donor added"}), 201
    finally:
        cursor.close()
        conn.close()


@app.route("/api/donors/<int:donor_id>", methods=["PUT"])
def update_donor(donor_id):
    data = request.get_json()
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            UPDATE donor SET name=%s, blood_type=%s, contact_no=%s, address=%s, Age=%s
            WHERE donor_id=%s
        """, (data.get("name"), data.get("blood_type"), data.get("contact_no"), data.get("address"), data.get("Age"), donor_id))
        conn.commit()
        if cursor.rowcount == 0:
            return jsonify({"error": "Donor not found"}), 404
        return jsonify({"message": "Donor updated"})
    finally:
        cursor.close()
        conn.close()


@app.route("/api/donors/<int:donor_id>", methods=["DELETE"])
def delete_donor(donor_id):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM donor WHERE donor_id = %s", (donor_id,))
        conn.commit()
        if cursor.rowcount == 0:
            return jsonify({"error": "Donor not found"}), 404
        return jsonify({"message": "Donor deleted"})
    finally:
        cursor.close()
        conn.close()


# ══════════════════════════════════════════════════════════════════════════════
# DONATIONS
# ══════════════════════════════════════════════════════════════════════════════
@app.route("/api/donations", methods=["GET"])
def get_donations():
    donor_id = request.args.get("donor_id")
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        if donor_id:
            cursor.execute("""
                SELECT don.*, d.name AS donor_name, d.blood_type
                FROM donation don JOIN donor d ON don.donor_id = d.donor_id
                WHERE don.donor_id = %s ORDER BY don.donation_date DESC
            """, (donor_id,))
        else:
            cursor.execute("""
                SELECT don.*, d.name AS donor_name, d.blood_type
                FROM donation don JOIN donor d ON don.donor_id = d.donor_id
                ORDER BY don.donation_date DESC
            """)
        donations = cursor.fetchall()
        for d in donations:
            if isinstance(d.get("donation_date"), date):
                d["donation_date"] = d["donation_date"].isoformat()
        return jsonify(donations)
    finally:
        cursor.close()
        conn.close()


@app.route("/api/donations", methods=["POST"])
def add_donation():
    data = request.get_json()
    if not data.get("donor_id") or not data.get("donation_date"):
        return jsonify({"error": "donor_id and donation_date are required"}), 400
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            INSERT INTO donation (donor_id, donation_date, quatity)
            VALUES (%s, %s, %s)
        """, (data["donor_id"], data["donation_date"], data.get("quatity", 1)))
        conn.commit()
        return jsonify({"id": cursor.lastrowid, "message": "Donation recorded"}), 201
    finally:
        cursor.close()
        conn.close()


@app.route("/api/donations/<int:donation_id>", methods=["DELETE"])
def delete_donation(donation_id):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM donation WHERE donation_id = %s", (donation_id,))
        conn.commit()
        if cursor.rowcount == 0:
            return jsonify({"error": "Not found"}), 404
        return jsonify({"message": "Deleted"})
    finally:
        cursor.close()
        conn.close()


# ══════════════════════════════════════════════════════════════════════════════
# INVENTORY
# ══════════════════════════════════════════════════════════════════════════════
@app.route("/api/inventory", methods=["GET"])
def get_inventory():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT d.blood_type,
                   COUNT(DISTINCT d.donor_id) AS donor_count,
                   COUNT(don.donation_id) AS donation_count,
                   COALESCE(SUM(don.quatity), 0) AS total_units
            FROM donor d LEFT JOIN donation don ON don.donor_id = d.donor_id
            GROUP BY d.blood_type ORDER BY d.blood_type
        """)
        inventory = cursor.fetchall()
        for item in inventory:
            item["total_units"] = float(item["total_units"])
        return jsonify(inventory)
    finally:
        cursor.close()
        conn.close()


# ══════════════════════════════════════════════════════════════════════════════
# RECIPIENTS — table is "recepient", PK is "recepient_id", contact is "phone_no"
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
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        query = "SELECT * FROM recepient WHERE 1=1"
        params = []
        if search:
            s_upper = search.upper()
            blood_types = ["A+","A-","B+","B-","AB+","AB-","O+","O-"]
            if s_upper in blood_types:
                query += " AND UPPER(blood_type) = %s"
                params += [s_upper]
            else:
                query += " AND (name LIKE %s OR phone_no LIKE %s OR address LIKE %s OR CAST(recepient_id AS CHAR) LIKE %s OR UPPER(blood_type) LIKE %s)"
                like = f"%{search}%"
                like = f"%{search}%"
                params += [like, like, like, like, f"%{s_upper}%"]
        query += " ORDER BY recepient_id DESC"
        cursor.execute(query, params)
        rows = cursor.fetchall()
        # normalize key names for frontend
        for r in rows:
            r["recipient_id"] = r.pop("recepient_id")
            r["contact_no"] = r.pop("phone_no", "")
        return jsonify(rows)
    finally:
        cursor.close()
        conn.close()


@app.route("/api/recipients", methods=["POST"])
def add_recipient():
    data = request.get_json()
    if not data.get("name") or not data.get("blood_type"):
        return jsonify({"error": "name and blood_type are required"}), 400
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            INSERT INTO recepient (name, blood_type, phone_no, address)
            VALUES (%s, %s, %s, %s)
        """, (data["name"], data["blood_type"], data.get("contact_no"), data.get("address")))
        conn.commit()
        return jsonify({"id": cursor.lastrowid, "message": "Recipient added"}), 201
    finally:
        cursor.close()
        conn.close()


@app.route("/api/recipients/<int:recipient_id>", methods=["PUT"])
def update_recipient(recipient_id):
    data = request.get_json()
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            UPDATE recepient SET name=%s, blood_type=%s, phone_no=%s, address=%s
            WHERE recepient_id=%s
        """, (data.get("name"), data.get("blood_type"), data.get("contact_no"), data.get("address"), recipient_id))
        conn.commit()
        if cursor.rowcount == 0:
            return jsonify({"error": "Not found"}), 404
        return jsonify({"message": "Recipient updated"})
    finally:
        cursor.close()
        conn.close()


@app.route("/api/recipients/<int:recipient_id>", methods=["DELETE"])
def delete_recipient(recipient_id):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM recepient WHERE recepient_id = %s", (recipient_id,))
        conn.commit()
        if cursor.rowcount == 0:
            return jsonify({"error": "Not found"}), 404
        return jsonify({"message": "Recipient deleted"})
    finally:
        cursor.close()
        conn.close()


# ══════════════════════════════════════════════════════════════════════════════
# REQUESTS — uses recepient_id FK, status default is 'PENDING' (uppercase)
# ══════════════════════════════════════════════════════════════════════════════
@app.route("/api/requests", methods=["GET"])
def get_requests():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT r.request_id, r.recepient_id, r.blood_type, r.request_date,
                   r.status, r.contact_no,
                   rec.name AS recipient_name, rec.phone_no AS recipient_contact
            FROM request r
            JOIN recepient rec ON r.recepient_id = rec.recepient_id
            ORDER BY r.request_id DESC
        """)
        rows = cursor.fetchall()
        for r in rows:
            if isinstance(r.get("request_date"), date):
                r["request_date"] = r["request_date"].isoformat()
            # normalize status to title case for frontend badges
            if r.get("status"):
                r["status"] = r["status"].capitalize()
                if r["status"] == "Pending": r["status"] = "Pending"
        return jsonify(rows)
    finally:
        cursor.close()
        conn.close()


@app.route("/api/requests", methods=["POST"])
def add_request():
    data = request.get_json()
    if not data.get("recipient_id") or not data.get("blood_type") or not data.get("request_date"):
        return jsonify({"error": "recipient_id, blood_type and request_date are required"}), 400
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            INSERT INTO request (recepient_id, blood_type, request_date, contact_no, status)
            VALUES (%s, %s, %s, %s, 'PENDING')
        """, (data["recipient_id"], data["blood_type"], data["request_date"], data.get("contact_no")))
        conn.commit()
        return jsonify({"id": cursor.lastrowid, "message": "Request created"}), 201
    finally:
        cursor.close()
        conn.close()


@app.route("/api/requests/<int:request_id>/status", methods=["PUT"])
def update_request_status(request_id):
    data = request.get_json()
    status = data.get("status", "").upper()
    if status not in ("PENDING", "APPROVED", "FULFILLED"):
        return jsonify({"error": "Invalid status"}), 400
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("UPDATE request SET status=%s WHERE request_id=%s", (status, request_id))
        conn.commit()
        if cursor.rowcount == 0:
            return jsonify({"error": "Not found"}), 404
        return jsonify({"message": f"Status updated to {status}"})
    finally:
        cursor.close()
        conn.close()


@app.route("/api/requests/<int:request_id>", methods=["DELETE"])
def delete_request(request_id):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM request WHERE request_id = %s", (request_id,))
        conn.commit()
        if cursor.rowcount == 0:
            return jsonify({"error": "Not found"}), 404
        return jsonify({"message": "Request deleted"})
    finally:
        cursor.close()
        conn.close()


# ══════════════════════════════════════════════════════════════════════════════
# SERVE REACT — must be LAST
# ══════════════════════════════════════════════════════════════════════════════
@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve(path):
    if path and os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    return send_from_directory(app.static_folder, "index.html")


if __name__ == "__main__":
    app.run(debug=True, port=5000)
>>>>>>> e7ebdeb (All changes implemented)
