<<<<<<< HEAD
import mysql.connector

def get_connection():
    return mysql.connector.connect(
        host="localhost",
        user="root",
        password="root123",
        database="blood_donation_db"
    )
=======
import mysql.connector
import os

def get_connection():
    return mysql.connector.connect(
        host=os.environ.get("DB_HOST", "localhost"),
        user=os.environ.get("DB_USER", "root"),
        password=os.environ.get("DB_PASSWORD", "root123"),
      database=os.environ.get("DB_NAME", "blood_bank")
    )



def init_db():
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS donor (
            donor_id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            blood_type VARCHAR(30) NOT NULL,
            contact_no VARCHAR(20),
            address VARCHAR(255),
            Age INT
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS donation (
            donation_id INT AUTO_INCREMENT PRIMARY KEY,
            donor_id INT NOT NULL,
            donation_date DATE NOT NULL,
            quatity INT DEFAULT 1,
            FOREIGN KEY (donor_id) REFERENCES donor(donor_id) ON DELETE CASCADE
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS recipient (
            recipient_id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            blood_type VARCHAR(30) NOT NULL,
            contact_no VARCHAR(20),
            address VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS request (
            request_id INT AUTO_INCREMENT PRIMARY KEY,
            recipient_id INT NOT NULL,
            blood_type VARCHAR(30) NOT NULL,
            request_date DATE NOT NULL,
            contact_no VARCHAR(20),
            status ENUM('Pending','Approved','Fulfilled') DEFAULT 'Pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (recipient_id) REFERENCES recipient(recipient_id) ON DELETE CASCADE
        )
    """)

    conn.commit()
    cursor.close()
    conn.close()
>>>>>>> e7ebdeb (All changes implemented)
