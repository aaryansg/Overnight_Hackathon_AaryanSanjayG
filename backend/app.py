# Update your app.py to include the processing blueprint
from flask import Flask
from flask_cors import CORS
from database import init_database
from auth_api import auth_bp, doc_bp
from processing_api import processing_bp  # Add this import
import os

app = Flask(__name__)

# Configure session
app.config['SECRET_KEY'] = 'your-secret-key-change-this-in-production'
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.config['SESSION_COOKIE_SECURE'] = False
app.config['SESSION_COOKIE_HTTPONLY'] = True

# Configure CORS properly
CORS(app, 
     origins="http://localhost:3000",
     supports_credentials=True)

# Initialize database
init_database(app)

# Register blueprints
app.register_blueprint(auth_bp, url_prefix='/api/auth')
app.register_blueprint(doc_bp, url_prefix='/api')
app.register_blueprint(processing_bp, url_prefix='/api/processing')  # Add this

if __name__ == '__main__':
    # Create necessary directories
    directories = ['uploads', 'temp_uploads', 'processed_docs']
    for directory in directories:
        if not os.path.exists(directory):
            os.makedirs(directory)
    
    # Create department subdirectories
    departments = ['engineering', 'operations', 'procurement', 'hr', 'safety', 'compliance', 'admin', 'finance', 'management']
    for dept in departments:
        dept_path = os.path.join('processed_docs', dept)
        if not os.path.exists(dept_path):
            os.makedirs(dept_path)
    
    app.run(debug=True, port=5000, host='0.0.0.0')