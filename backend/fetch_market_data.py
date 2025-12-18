import requests
from datetime import datetime, timedelta
import time
import os
import pandas as pd
import json

API_KEY = '579b464db66ec23bdd0000011f39e117c7784e335a1cd1d7897779de' # Replace with your actual key

API_ENDPOINTS = [
    'https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070',
    'https://api.data.gov.in/resource/35985678-0d79-4abf-b6f2-c1bfd384ba69'
]

DATA_FOLDER = 'daily_market_data'

def fetch_records(api_url, api_key, date, limit=10000, max_records=100000):
    all_records = []
    offset = 0
    date_str = date.strftime('%Y-%m-%d')
    while offset < max_records:
        params = {
            'api-key': api_key,
            'format': 'json',
            'limit': limit,
            'offset': offset,
            'filters[arrival_date]': date_str,
        }
        try:
            response = requests.get(api_url, params=params, timeout=15)
            response.raise_for_status()
            data = response.json()
            records = data.get('records', [])
            if not records:
                break
            all_records.extend(records)
            print(f"Fetched {len(records)} records for {date_str} from offset {offset}")
            if len(records) < limit:
                break
            offset += limit
            time.sleep(1)
        except Exception as e:
            print(f"Error fetching records for {date_str} at offset {offset}: {e}")
            break
    return all_records

def process_records(records):
    processed = []
    for rec in records:
        try:
            price = rec.get('modal_price') or rec.get('max_price') or rec.get('price')
            if price:
                price = float(price)
            else:
                continue
            arrival_qty = rec.get('arrivals') or rec.get('quantity') or rec.get('arrival_quantity') or 0
            arrival_qty = float(arrival_qty) if arrival_qty else 0
            date_str = rec.get('arrival_date') or rec.get('date') or ''
            try:
                date = datetime.strptime(date_str, '%Y-%m-%d')
            except Exception:
                date = datetime.now()

            processed.append({
                'state': rec.get('state') or rec.get('state_name') or '',
                'district': rec.get('district') or rec.get('district_name') or '',
                'market': rec.get('market') or rec.get('market_name') or '',
                'commodity': rec.get('commodity') or rec.get('commodity_name') or '',
                'variety': rec.get('variety') or rec.get('variety_name') or '',
                'price': price,
                'quantity': arrival_qty,
                'date': date
            })
        except Exception as e:
            print(f"Skipping record due to error: {e}")
            continue
    return processed

def store_daily_json(records, date):
    """Stores records for a specific day into a new JSON file."""
    if not os.path.exists(DATA_FOLDER):
        os.makedirs(DATA_FOLDER)
    
    date_str = date.strftime('%Y_%m_%d')
    file_path = os.path.join(DATA_FOLDER, f'market_data_{date_str}.json')
    
    json_serializable_records = []
    for rec in records:
        rec['date'] = rec['date'].isoformat()
        json_serializable_records.append(rec)

    with open(file_path, 'w') as f:
        json.dump(json_serializable_records, f, indent=4)

    print(f"Stored {len(records)} records in {file_path}")

def delete_old_json_files():
    """Deletes JSON files older than 7 days."""
    if not os.path.exists(DATA_FOLDER):
        return

    cutoff_date = datetime.now().date() - timedelta(days=7)
    
    for filename in os.listdir(DATA_FOLDER):
        if filename.startswith('market_data_') and filename.endswith('.json'):
            try:
                file_date_str = filename.replace('market_data_', '').replace('.json', '').replace('_', '-')
                file_date = datetime.strptime(file_date_str, '%Y-%m-%d').date()
                if file_date < cutoff_date:
                    file_path = os.path.join(DATA_FOLDER, filename)
                    os.remove(file_path)
                    print(f"Deleted old file: {file_path}")
            except (ValueError, FileNotFoundError) as e:
                print(f"Warning: Could not process or delete file {filename}: {e}")

def run_data_pipeline():
    """Main function to run the entire data pipeline."""
    api_key = API_KEY
    if not api_key:
        print("Please set your Data.gov.in API key in API_KEY variable")
        return
    
    delete_old_json_files()
    
    today = datetime.now().date()
    for i in range(7):
        date_to_fetch = today - timedelta(days=i)
        all_records = []
        for url in API_ENDPOINTS:
            records = fetch_records(url, api_key, date=date_to_fetch)
            all_records.extend(records)
        
        processed_data = process_records(all_records)
        store_daily_json(processed_data, date_to_fetch)

if __name__ == '__main__':
    run_data_pipeline()