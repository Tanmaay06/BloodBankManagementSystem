<<<<<<< HEAD
import mysql.connector

# ---------- DB CONNECTION ----------
def get_connection():
    return mysql.connector.connect(
        host="localhost",
        user="root",
        password="root123",   # change if needed
        database="blood_donation_db"
    )

# ---------- ADD ----------
def add_donor(name, age, gender, blood_group, phone, address):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        """
        INSERT INTO donor (name, age, gender, blood_group, phone, address)
        VALUES (%s,%s,%s,%s,%s,%s)
        """,
        (name, age, gender, blood_group, phone, address)
    )
    conn.commit()
    conn.close()

# ---------- VIEW ----------
def get_all_donors():
    conn = get_connection()
    cur = conn.cursor(dictionary=True)
    cur.execute("SELECT * FROM donor")
    data = cur.fetchall()
    conn.close()
    return data

# ---------- SEARCH ----------
def search_by_blood(blood):
    conn = get_connection()
    cur = conn.cursor(dictionary=True)
    cur.execute("SELECT * FROM donor WHERE blood_group=%s", (blood,))
    data = cur.fetchall()
    conn.close()
    return data

# ---------- DELETE ----------
def delete_donor(donor_id):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("DELETE FROM donor WHERE donor_id=%s", (donor_id,))
    conn.commit()
    conn.close()

# ---------- UPDATE ----------
def update_donor(donor_id, name, age, gender, blood, phone, address):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        """
        UPDATE donor
        SET name=%s, age=%s, gender=%s, blood_group=%s, phone=%s, address=%s
        WHERE donor_id=%s
        """,
        (name, age, gender, blood, phone, address, donor_id)
    )
    conn.commit()
    conn.close()

# ---------- DASHBOARD ----------
def dashboard_data():
    conn = get_connection()
    cur = conn.cursor(dictionary=True)

    cur.execute("SELECT COUNT(*) AS total FROM donor")
    total = cur.fetchone()["total"]

    cur.execute("""
        SELECT blood_group, COUNT(*) AS count
        FROM donor
        GROUP BY blood_group
    """)
    stats = cur.fetchall()

    conn.close()
    return total, stats
=======
import mysql.connector
from datetime import date, timedelta

# ---------- DB CONNECTION ----------
def get_connection():
    return mysql.connector.connect(
        host="localhost",
        user="root",
        password="root123",     # change if needed
        database="blood_bank_management"
    )

# ---------- DONOR ----------
def add_donor(name, age, blood_type, contact_no, address):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO donor (name, age, blood_type, contact_no, address)
        VALUES (%s,%s,%s,%s,%s)
    """, (name, age, blood_type, contact_no, address))
    conn.commit()
    conn.close()

def get_all_donors():
    conn = get_connection()
    cur = conn.cursor(dictionary=True)
    cur.execute("SELECT * FROM donor")
    data = cur.fetchall()
    conn.close()
    return data

def delete_donor(donor_id):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("DELETE FROM donor WHERE donor_id=%s", (donor_id,))
    conn.commit()
    conn.close()

def update_donor(donor_id, name, age, blood_type, contact_no, address):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("""
        UPDATE donor
        SET name=%s, age=%s, blood_type=%s, contact_no=%s, address=%s
        WHERE donor_id=%s
    """, (name, age, blood_type, contact_no, address, donor_id))
    conn.commit()
    conn.close()


# ---------- DONATION + STOCK ----------
def add_donation(donor_id, blood_bank_id, blood_type, quantity):

    conn = get_connection()
    cur = conn.cursor()

    try:
        # ✅ STEP 1: check donor exists (VERY IMPORTANT)
        cur.execute("SELECT donor_id FROM donor WHERE donor_id=%s", (donor_id,))
        donor = cur.fetchone()

        if donor is None:
            print("❌ Invalid donor ID! Donation cancelled.")
            return

        # ✅ STEP 2: insert donation
        cur.execute("""
            INSERT INTO donation (donor_id, donation_date, quantity)
            VALUES (%s, %s, %s)
        """, (donor_id, date.today(), quantity))

        # Expiry = 42 days
        expiry_date = date.today() + timedelta(days=42)

        # ✅ STEP 3: check stock
        cur.execute("""
            SELECT stock_id FROM blood_stock
            WHERE blood_bank_id=%s AND blood_type=%s
        """, (blood_bank_id, blood_type))

        stock = cur.fetchone()

        if stock:
            cur.execute("""
                UPDATE blood_stock
                SET quantity = quantity + %s
                WHERE blood_bank_id=%s AND blood_type=%s
            """, (quantity, blood_bank_id, blood_type))
        else:
            cur.execute("""
                INSERT INTO blood_stock
                (blood_bank_id, blood_type, quantity, expiry_date)
                VALUES (%s,%s,%s,%s)
            """, (blood_bank_id, blood_type, quantity, expiry_date))

        conn.commit()
        print("✅ Donation added successfully")

    except Exception as e:
        conn.rollback()
        print("❌ Error:", e)

    finally:
        conn.close()


# ---------- REQUEST ----------
def create_request(recipient_id, blood_bank_id, blood_type, contact_no):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO request
        (recipient_id, blood_bank_id, blood_type, request_date, status, contact_no)
        VALUES (%s,%s,%s,CURDATE(),'Pending',%s)
    """, (recipient_id, blood_bank_id, blood_type, contact_no))
    conn.commit()
    conn.close()

def get_requests():
    conn = get_connection()
    cur = conn.cursor(dictionary=True)
    cur.execute("SELECT * FROM request")
    data = cur.fetchall()
    conn.close()
    return data

def fulfill_request(request_id):
    conn = get_connection()
    cur = conn.cursor(dictionary=True)

    cur.execute("""
        SELECT blood_bank_id, blood_type
        FROM request
        WHERE request_id=%s
    """, (request_id,))
    req = cur.fetchone()

    cur.execute("""
        UPDATE blood_stock
        SET quantity = quantity - 1
        WHERE blood_bank_id=%s AND blood_type=%s AND quantity > 0
    """, (req["blood_bank_id"], req["blood_type"]))

    cur.execute("""
        UPDATE request SET status='Approved'
        WHERE request_id=%s
    """, (request_id,))

    conn.commit()
    conn.close()

# ---------- DASHBOARD ----------
def dashboard_data():
    conn = get_connection()
    cur = conn.cursor(dictionary=True)

    cur.execute("SELECT COUNT(*) AS total FROM donor")
    total_donors = cur.fetchone()["total"]

    cur.execute("""
        SELECT blood_type, SUM(quantity) AS units
        FROM blood_stock
        GROUP BY blood_type
    """)
    stock = cur.fetchall()

    conn.close()
    return total_donors, stock
>>>>>>> e7ebdeb (All changes implemented)
