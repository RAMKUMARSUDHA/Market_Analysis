from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import requests
import os
import json
from datetime import datetime, timedelta
import random
import pandas as pd
import math
import traceback
import google.generativeai as genai

from flask_apscheduler import APScheduler

# -------------------------------------------------
# Scheduler config
# -------------------------------------------------
class Config:
    SCHEDULER_API_ENABLED = True

app = Flask(__name__, static_folder='../frontend', template_folder='../frontend')
app.config.from_object(Config())
CORS(app)

scheduler = APScheduler()

# -------------------------------------------------
# Data pipeline import
# -------------------------------------------------
try:
    from fetch_market_data import run_data_pipeline
except ImportError:
    print("WARNING: fetch_market_data.py not found.")
    def run_data_pipeline():
        print("Placeholder pipeline")

def update_data():
    print("Scheduled data update running...")
    run_data_pipeline()
    print("Scheduled data update finished")

scheduler.add_job(
    id='Scheduled Data Update',
    func=update_data,
    trigger='cron',
    hour=2,
    minute=0
)

# -------------------------------------------------
# Firebase Initialization (SAFE)
# -------------------------------------------------
firebase_available = False
db = None

try:
    import firebase_admin
    from firebase_admin import credentials, firestore, auth

    required_vars = [
        'FIREBASE_PROJECT_ID',
        'FIREBASE_PRIVATE_KEY_ID',
        'FIREBASE_PRIVATE_KEY',
        'FIREBASE_CLIENT_EMAIL',
        'FIREBASE_CLIENT_ID'
    ]

    if all(os.getenv(v) for v in required_vars):
        cred = credentials.Certificate({
            "type": "service_account",
            "project_id": os.getenv('FIREBASE_PROJECT_ID'),
            "private_key_id": os.getenv('FIREBASE_PRIVATE_KEY_ID'),
            "private_key": os.getenv('FIREBASE_PRIVATE_KEY').replace('\\n', '\n'),
            "client_email": os.getenv('FIREBASE_CLIENT_EMAIL'),
            "client_id": os.getenv('FIREBASE_CLIENT_ID'),
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
        })

        firebase_admin.initialize_app(cred)
        db = firestore.client()
        firebase_available = True
        print("✅ Firebase initialized")

    else:
        print("⚠ Firebase env vars missing → fallback auth")

except Exception as e:
    firebase_available = False
    print(f"⚠ Firebase init failed: {e}")
    print("📝 Using fallback authentication")

# -------------------------------------------------
# Gemini AI config
# -------------------------------------------------
if os.getenv('GEMINI_API_KEY'):
    genai.configure(api_key=os.getenv('GEMINI_API_KEY'))
    print("✅ Gemini configured")
else:
    print("⚠ GEMINI_API_KEY missing")

# -------------------------------------------------
# Fallback user store
# -------------------------------------------------
users_db = {}

# -------------------------------------------------
# Static frontend
# -------------------------------------------------
@app.route('/')
def index():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory(app.static_folder, path)

# -------------------------------------------------
# Auth: Register
# -------------------------------------------------
@app.route('/api/auth/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')
        full_name = data.get('fullName')
        location = data.get('location')
        farm_size = data.get('farmSize')

        if firebase_available:
            user = auth.create_user(
                email=email,
                password=password,
                display_name=full_name
            )

            user_data = {
                'uid': user.uid,
                'email': email,
                'fullName': full_name,
                'location': location,
                'farmSize': farm_size,
                'userType': 'farmer',
                'createdAt': datetime.now()
            }

            db.collection('users').document(user.uid).set(user_data)

            return jsonify({
                'success': True,
                'message': 'User registered with Firebase',
                'user': {
                    'uid': user.uid,
                    'email': email,
                    'fullName': full_name
                }
            })

        else:
            if email in users_db:
                return jsonify({'success': False, 'error': 'User exists'}), 400

            user_id = f"user_{len(users_db)+1}"
            users_db[email] = {
                'uid': user_id,
                'email': email,
                'password': password,
                'fullName': full_name,
                'location': location,
                'farmSize': farm_size,
                'userType': 'farmer',
                'createdAt': datetime.now().isoformat()
            }

            return jsonify({
                'success': True,
                'message': 'User registered (fallback)',
                'user': {
                    'uid': user_id,
                    'email': email,
                    'fullName': full_name
                }
            })

    except Exception as e:
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 400

# -------------------------------------------------
# Auth: Login
# -------------------------------------------------
@app.route('/api/auth/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')

        if firebase_available:
            user_ref = db.collection('users').where('email', '==', email).limit(1).get()
            if user_ref:
                return jsonify({'success': True, 'user': user_ref[0].to_dict()})
            return jsonify({'success': False, 'error': 'Invalid credentials'}), 401

        else:
            if email in users_db and users_db[email]['password'] == password:
                user = users_db[email].copy()
                user.pop('password')
                return jsonify({'success': True, 'user': user})
            return jsonify({'success': False, 'error': 'Invalid credentials'}), 401

    except Exception as e:
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 400

# -------------------------------------------------
# Market data
# -------------------------------------------------
@app.route('/api/market-data')
def market_data():
    try:
        crop = request.args.get('crop', '').lower()
        state = request.args.get('state', '').lower()
        district = request.args.get('district', '').lower()
        market = request.args.get('market', '').lower()

        today = datetime.now().strftime('%Y_%m_%d')
        path = f'daily_market_data/market_data_{today}.json'

        if not os.path.exists(path):
            return jsonify({'success': False, 'error': 'Market data not ready'}), 404

        df = pd.read_json(path)

        if crop and 'commodity' in df:
            df = df[df['commodity'].str.lower().str.contains(crop, na=False)]
        if state and 'state' in df:
            df = df[df['state'].str.lower().str.contains(state.replace('-', ' '), na=False)]
        if district and 'district' in df:
            df = df[df['district'].str.lower().str.contains(district.replace('-', ' '), na=False)]
        if market and 'market' in df:
            df = df[df['market'].str.lower().str.contains(market, na=False)]

        if df.empty:
            return jsonify({'success': False, 'error': 'No data found'}), 404

        total_volume = df.get('quantity', pd.Series()).sum()
        avg_price = df.get('price', pd.Series()).mean()

        return jsonify({
            'success': True,
            'data': {
                'totalRecords': len(df),
                'averagePrice': round(avg_price, 2),
                'totalVolume': round(total_volume, 2),
                'markets': df.to_dict('records'),
                'lastUpdated': datetime.now().isoformat()
            }
        })

    except Exception as e:
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

# -------------------------------------------------
# Server start
# -------------------------------------------------
if __name__ == '__main__':
    scheduler.init_app(app)
    scheduler.start()
    print("🚀 Server running at http://localhost:5000")
    app.run(host='0.0.0.0', port=5000, debug=True)
