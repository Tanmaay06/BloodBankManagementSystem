# 🩸 Blood Donation Management System

A comprehensive, full-stack web application designed to streamline blood bank operations, manage donor records, track inventory, and facilitate blood requests.

## 🚀 Overview

This system provides a robust platform for blood banks to maintain real-time data on blood availability. It features a modern React-based frontend and a Python Flask backend, replacing the legacy Streamlit implementation for better scalability and user experience.

## ✨ Features

- **📊 Dynamic Dashboard**: Real-time visualization of blood group distribution, total donors, and recent donation activities.
- **👥 Donor Management**: Complete CRUD operations for managing donor profiles, including contact details and donor history.
- **💉 Donation Tracking**: specialized service to record new donations with automated calculation of quantities and expiry dates.
- **📋 Request Management**: Efficient handling of blood requests from recipients or hospitals, with status tracking (Pending, Approved, Fulfilled).
- **📦 Inventory System**: Categorized tracking of blood units to ensure critical types are always monitored.
- **🔍 Advanced Search**: Filter donors and recipients by blood type, age, or location.

## 🛠️ Tech Stack

### Frontend
- **Framework**: React.js
- **Styling**: Vanilla CSS / Tailwind CSS (Optional)
- **State Management**: React Hooks
- **Icons**: Lucide React / FontAwesome

### Backend
- **Language**: Python 3.x
- **Framework**: Flask
- **API**: RESTful architecture
- **Data Processing**: Pandas

### Database
- **Engine**: MySQL
- **ORM/Driver**: `mysql-connector-python`

## 📁 Project Structure

```text
├── app.py              # Flask Main Application & API Endpoints
├── db.py               # Database Configuration & Initialization
├── donor_service.py    # Business Logic & DB Operations
├── requirements.txt    # Python Dependencies
└── frontend/           # React Frontend Application
    ├── src/
    │   ├── App.jsx     # Main Application Component
    │   └── Landing.jsx # Main Dashboard & Entry Point
    └── package.json    # Frontend Dependencies
```

## ⚙️ Installation & Setup

### 1. Prerequisites
- Python 3.8+
- Node.js (v14+)
- MySQL Server

### 2. Backend Setup
1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
2. Configure your database in `db.py` or set environment variables:
   - `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`

3. Initialize and run the Flask server:
   ```bash
   python app.py
   ```

### 3. Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install packages:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.