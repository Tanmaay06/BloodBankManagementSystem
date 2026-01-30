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
