from flask import Flask
from flask_cors import CORS
from database import init_database
from auth_api import auth_bp, doc_bp
import os

app = Flask(__name__)

# Configure session
app.config['SECRET_KEY'] = 'your-secret-key-change-this-in-production'
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.config['SESSION_COOKIE_SECURE'] = False  # Set to True in production with HTTPS
app.config['SESSION_COOKIE_HTTPONLY'] = True

# Configure CORS properly - SIMPLIFIED VERSION
CORS(app, 
     origins="http://localhost:3000",
     supports_credentials=True)

# Initialize database
init_database(app)

# Register blueprints
app.register_blueprint(auth_bp, url_prefix='/api/auth')
app.register_blueprint(doc_bp, url_prefix='/api')

if __name__ == '__main__':
    # Create uploads directory if it doesn't exist
    if not os.path.exists('uploads'):
        os.makedirs('uploads')
    
    app.run(debug=True, port=5000, host='0.0.0.0')