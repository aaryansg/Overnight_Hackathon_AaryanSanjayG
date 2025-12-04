from flask import Blueprint, request, jsonify, session
from models import db, User, Document
import os
from werkzeug.utils import secure_filename
import uuid

auth_bp = Blueprint('auth', __name__)
doc_bp = Blueprint('documents', __name__)

ALLOWED_EXTENSIONS = {'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'jpg', 'png'}
UPLOAD_FOLDER = 'uploads'

# DEFINE DEPARTMENTS CONSTANT HERE
DEPARTMENTS = ['engineering', 'operations', 'procurement', 'hr', 'safety', 'compliance', 'admin']

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# Helper function to check if user is logged in
def login_required(f):
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({'error': 'Please login first'}), 401
        return f(*args, **kwargs)
    decorated_function.__name__ = f.__name__
    return decorated_function

# Helper function to get current user
def get_current_user():
    if 'user_id' in session:
        user = User.query.get(session['user_id'])
        if user:
            return user
    return None

@auth_bp.route('/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        
        if not data or not data.get('username') or not data.get('email') or not data.get('password'):
            return jsonify({'error': 'Missing required fields'}), 400
        
        # Check if username exists
        existing_user = User.query.filter_by(username=data['username']).first()
        if existing_user:
            return jsonify({'error': 'Username already exists'}), 400
        
        # Check if email exists
        existing_email = User.query.filter_by(email=data['email']).first()
        if existing_email:
            return jsonify({'error': 'Email already exists'}), 400
        
        department = data.get('department', '').lower()
        if department not in DEPARTMENTS:
            return jsonify({'error': 'Invalid department'}), 400
        
        # Create new user
        user = User(
            username=data['username'],
            email=data['email'],
            department=department,
            role='user' if department != 'admin' else 'admin'
        )
        user.set_password(data['password'])
        
        db.session.add(user)
        db.session.commit()
        
        # Set session
        session['user_id'] = user.id
        
        return jsonify({
            'message': 'User registered successfully',
            'user': user.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        
        if not data or not data.get('username') or not data.get('password'):
            return jsonify({'error': 'Missing username or password'}), 400
        
        user = User.query.filter_by(username=data['username']).first()
        
        if not user:
            return jsonify({'error': 'Invalid credentials'}), 401
        
        if not user.check_password(data['password']):
            return jsonify({'error': 'Invalid credentials'}), 401
        
        if not user.is_active:
            return jsonify({'error': 'Account is disabled'}), 403
        
        # Set session
        session['user_id'] = user.id
        
        return jsonify({
            'message': 'Login successful',
            'user': user.to_dict()
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/logout', methods=['POST'])
def logout():
    session.pop('user_id', None)
    return jsonify({'message': 'Logged out successfully'})

@auth_bp.route('/me', methods=['GET'])
def get_current_user_info():
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Not logged in'}), 401
    
    return jsonify(user.to_dict())

@auth_bp.route('/departments', methods=['GET'])
def get_departments():
    # Return the DEPARTMENTS list as JSON
    return jsonify(DEPARTMENTS)

@auth_bp.route('/categories', methods=['GET'])
def get_categories():
    categories = db.session.query(Document.category).distinct().filter(Document.category.isnot(None)).all()
    return jsonify([cat[0] for cat in categories])

@doc_bp.route('/upload', methods=['POST'])
@login_required
def upload_document():
    try:
        user = get_current_user()
        
        if 'file' not in request.files:
            return jsonify({'error': 'No file uploaded'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        if not allowed_file(file.filename):
            return jsonify({'error': 'File type not allowed'}), 400
        
        title = request.form.get('title', '')
        description = request.form.get('description', '')
        department = request.form.get('department', user.department)
        category = request.form.get('category', '')
        tags = request.form.get('tags', '')
        
        if department not in DEPARTMENTS:
            return jsonify({'error': 'Invalid department'}), 400
        
        # Ensure upload directory exists
        if not os.path.exists(UPLOAD_FOLDER):
            os.makedirs(UPLOAD_FOLDER)
        
        # Generate unique filename
        filename = secure_filename(file.filename)
        unique_filename = f"{uuid.uuid4().hex}_{filename}"
        file_path = os.path.join(UPLOAD_FOLDER, unique_filename)
        
        file.save(file_path)
        
        document = Document(
            title=title or filename,
            description=description,
            filename=filename,
            file_path=file_path,
            file_size=os.path.getsize(file_path),
            file_type=filename.rsplit('.', 1)[1].lower(),
            department=department,
            category=category,
            tags=tags,
            uploaded_by=user.id
        )
        
        db.session.add(document)
        db.session.commit()
        
        return jsonify({
            'message': 'File uploaded successfully',
            'document': document.to_dict()
        }), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@doc_bp.route('/documents', methods=['GET'])
@login_required
def get_documents():
    try:
        user = get_current_user()
        
        department = request.args.get('department')
        category = request.args.get('category')
        search = request.args.get('search')
        
        query = Document.query
        
        if user.role != 'admin' and user.department != 'admin':
            query = query.filter_by(department=user.department)
        elif department and department in DEPARTMENTS:
            query = query.filter_by(department=department)
        
        if category:
            query = query.filter_by(category=category)
        
        if search:
            query = query.filter(
                (Document.title.contains(search)) |
                (Document.description.contains(search)) |
                (Document.tags.contains(search))
            )
        
        documents = query.order_by(Document.created_at.desc()).all()
        
        return jsonify([doc.to_dict() for doc in documents])
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@doc_bp.route('/documents/<int:doc_id>', methods=['GET'])
@login_required
def get_document(doc_id):
    try:
        user = get_current_user()
        
        document = Document.query.get_or_404(doc_id)
        
        # Check permissions
        if user.role != 'admin' and user.department != document.department:
            return jsonify({'error': 'Access denied'}), 403
        
        # Increment view count
        document.views += 1
        db.session.commit()
        
        return jsonify(document.to_dict())
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@doc_bp.route('/documents/<int:doc_id>/download', methods=['GET'])
@login_required
def download_document(doc_id):
    try:
        user = get_current_user()
        
        document = Document.query.get_or_404(doc_id)
        
        # Check permissions
        if user.role != 'admin' and user.department != document.department:
            return jsonify({'error': 'Access denied'}), 403
        
        # Increment download count
        document.downloads += 1
        db.session.commit()
        
        from flask import send_file
        return send_file(document.file_path, as_attachment=True, download_name=document.filename)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/users', methods=['GET'])
@login_required
def get_users():
    try:
        user = get_current_user()
        
        if user.role != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        
        users = User.query.all()
        return jsonify([u.to_dict() for u in users])
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/users/<int:user_id>', methods=['PUT'])
@login_required
def update_user(user_id):
    try:
        user = get_current_user()
        
        if user.role != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        
        target_user = User.query.get_or_404(user_id)
        data = request.get_json()
        
        if 'department' in data and data['department'] in DEPARTMENTS:
            target_user.department = data['department']
        
        if 'role' in data:
            target_user.role = data['role']
        
        if 'is_active' in data:
            target_user.is_active = data['is_active']
        
        db.session.commit()
        
        return jsonify({
            'message': 'User updated successfully',
            'user': target_user.to_dict()
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500