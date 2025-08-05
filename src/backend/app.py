from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import pandas as pd
from analysis import run_analysis

app = Flask(__name__)
CORS(app)  # This enables CORS for all routes

UPLOAD_FOLDER = 'uploads'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Store the result in memory
results_cache = {}

@app.route('/')
def home():
    return jsonify({"message": "Upload CSV to /upload for analysis"})

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], file.filename)
    file.save(filepath)
    
    try:
        df = pd.read_csv(filepath)
        if 'Price' not in df.columns or 'Date' not in df.columns:
            return jsonify({'error': 'CSV must contain Date and Price columns'}), 400
        
        results = run_analysis(df)
        results_cache[file.filename] = results
        
        return jsonify({'message': 'Analysis complete', 'filename': file.filename})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/change-point/<filename>', methods=['GET'])
def get_change_point(filename):
    if filename not in results_cache:
        return jsonify({'error': 'No analysis found for that file'}), 404
    return jsonify({'change_point_date': results_cache[filename]['change_point_date']})

@app.route('/volatility/<filename>', methods=['GET'])
def get_volatility(filename):
    if filename not in results_cache:
        return jsonify({'error': 'No analysis found for that file'}), 404
    r = results_cache[filename]
    return jsonify({
        'volatility_before': r['volatility_before'],
        'volatility_after': r['volatility_after'],
        'volatility_change_pct': r['volatility_change_pct']
    })

@app.route('/price/<filename>', methods=['GET'])
def get_price_change(filename):
    if filename not in results_cache:
        return jsonify({'error': 'No analysis found for that file'}), 404
    r = results_cache[filename]
    return jsonify({
        'avg_price_before': r['avg_price_before'],
        'avg_price_after': r['avg_price_after'],
        'price_change_pct': r['price_change_pct']
    })

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)