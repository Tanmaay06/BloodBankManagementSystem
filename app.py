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
