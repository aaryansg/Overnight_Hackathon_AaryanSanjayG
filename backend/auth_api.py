from flask import Blueprint, request, jsonify
from models import db, User, Document
import os
from werkzeug.utils import secure_filename
import uuid
import boto3
from botocore.exceptions import NoCredentialsError, ClientError
from dotenv import load_dotenv
import base64

load_dotenv()

auth_bp = Blueprint('auth', __name__)
doc_bp = Blueprint('documents', __name__)

ALLOWED_EXTENSIONS = {'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'jpg', 'png', 'jpeg'}
UPLOAD_FOLDER = 'uploads'

# DEFINE DEPARTMENTS CONSTANT HERE
DEPARTMENTS = ['engineering', 'operations', 'procurement', 'hr', 'safety', 'compliance', 'admin']

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# AWS S3 Configuration
AWS_S3_BUCKET = os.getenv('AWS_S3_BUCKET')
AWS_REGION = os.getenv('AWS_REGION', 'us-east-1')

def get_s3_client():
    return boto3.client(
        's3',
        aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
        aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
        region_name=AWS_REGION
    )

# Simple authentication helper
def authenticate_user(username, password, required_role=None):
    """Authenticate user and check optional role requirement"""
    user = User.query.filter_by(username=username).first()
    
    if not user:
        return None
    
    if not user.check_password(password):
        return None
    
    if not user.is_active:
        return None
    
    if required_role and user.role != required_role:
        return None
    
    return user

def get_user_from_request():
    """Extract user credentials from request"""
    # Try Basic Auth header
    auth_header = request.headers.get('Authorization')
    if auth_header and auth_header.startswith('Basic '):
        try:
            auth_decoded = base64.b64decode(auth_header[6:]).decode('utf-8')
            username, password = auth_decoded.split(':', 1)
            return username, password
        except:
            pass
    
    # Try JSON body
    data = request.get_json(silent=True)
    if data:
        username = data.get('username')
        password = data.get('password')
        if username and password:
            return username, password
    
    # Try form data
    username = request.form.get('username')
    password = request.form.get('password')
    if username and password:
        return username, password
    
    # Try query parameters
    username = request.args.get('username')
    password = request.args.get('password')
    if username and password:
        return username, password
    
    return None, None

def auth_required(required_role=None):
    """Decorator for authentication"""
    def decorator(f):
        def wrapper(*args, **kwargs):
            username, password = get_user_from_request()
            
            if not username or not password:
                return jsonify({'error': 'Authentication required'}), 401
            
            user = authenticate_user(username, password, required_role)
            if not user:
                return jsonify({'error': 'Invalid credentials or insufficient permissions'}), 401
            
            # Attach user to request context
            request.user = user
            return f(*args, **kwargs)
        wrapper.__name__ = f.__name__
        return wrapper
    return decorator

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
        
        return jsonify({
            'message': 'Login successful',
            'user': user.to_dict()
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/logout', methods=['POST'])
def logout():
    return jsonify({'message': 'Logged out successfully'})

@auth_bp.route('/me', methods=['POST'])
def get_current_user_info():
    try:
        data = request.get_json()
        
        if not data or not data.get('username') or not data.get('password'):
            return jsonify({'error': 'Authentication required'}), 401
        
        user = authenticate_user(data['username'], data['password'])
        if not user:
            return jsonify({'error': 'Invalid credentials'}), 401
        
        return jsonify(user.to_dict())
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/departments', methods=['GET'])
def get_departments():
    # Return the DEPARTMENTS list as JSON
    return jsonify(DEPARTMENTS)

@auth_bp.route('/categories', methods=['GET'])
def get_categories():
    categories = db.session.query(Document.category).distinct().filter(Document.category.isnot(None)).all()
    return jsonify([cat[0] for cat in categories])

@doc_bp.route('/upload', methods=['POST'])
@auth_required()
def upload_document():
    try:
        user = request.user
        
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

@doc_bp.route('/upload-s3', methods=['POST'])
def upload_document_s3():
    try:
        # Get credentials from form data
        username = request.form.get('username')
        password = request.form.get('password')
        
        if not username or not password:
            return jsonify({'error': 'Authentication required'}), 401
        
        user = authenticate_user(username, password)
        if not user:
            return jsonify({'error': 'Invalid credentials'}), 401
        
        if 'file' not in request.files:
            return jsonify({'error': 'No file uploaded'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        if not allowed_file(file.filename):
            return jsonify({'error': 'File type not allowed'}), 400
        
        # Get form data
        title = request.form.get('title', '')
        description = request.form.get('description', '')
        department = request.form.get('department', user.department)
        category = request.form.get('category', '')
        tags = request.form.get('tags', '')
        
        if department not in DEPARTMENTS:
            return jsonify({'error': 'Invalid department'}), 400
        
        # Generate unique filename for S3
        filename = secure_filename(file.filename)
        unique_filename = f"{uuid.uuid4().hex}_{filename}"
        
        # Upload to S3
        s3_client = get_s3_client()
        
        try:
            # Get file content for size calculation
            file_content = file.read()
            file_size = len(file_content)
            file.seek(0)  # Reset file pointer for upload
            
            # Upload file to S3
            s3_client.upload_fileobj(
                file,
                AWS_S3_BUCKET,
                unique_filename,
                ExtraArgs={
                    'ContentType': file.content_type,
                    'Metadata': {
                        'uploaded-by': user.username,
                        'department': department,
                        'category': category,
                        'original-filename': filename
                    }
                }
            )
            
            # Generate S3 URL
            s3_url = f"https://{AWS_S3_BUCKET}.s3.{AWS_REGION}.amazonaws.com/{unique_filename}"
            
            # Create document record in database
            document = Document(
                title=title or filename,
                description=description,
                filename=filename,
                file_path=s3_url,  # Store S3 URL instead of local path
                file_size=file_size,
                file_type=filename.rsplit('.', 1)[1].lower(),
                department=department,
                category=category,
                tags=tags,
                uploaded_by=user.id,
                status='active'
            )
            
            db.session.add(document)
            db.session.commit()
            
            return jsonify({
                'message': 'File uploaded to S3 successfully',
                'document': document.to_dict(),
                's3_url': s3_url
            }), 201
            
        except NoCredentialsError:
            return jsonify({'error': 'AWS credentials not available'}), 500
        except ClientError as e:
            return jsonify({'error': f'S3 upload error: {str(e)}'}), 500
            
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@doc_bp.route('/documents', methods=['GET'])
def get_documents():
    try:
        # Get credentials
        username = request.args.get('username')
        password = request.args.get('password')
        
        if not username or not password:
            return jsonify({'error': 'Authentication required'}), 401
        
        user = authenticate_user(username, password)
        if not user:
            return jsonify({'error': 'Invalid credentials'}), 401
        
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
def get_document(doc_id):
    try:
        # Get credentials
        username = request.args.get('username')
        password = request.args.get('password')
        
        if not username or not password:
            return jsonify({'error': 'Authentication required'}), 401
        
        user = authenticate_user(username, password)
        if not user:
            return jsonify({'error': 'Invalid credentials'}), 401
        
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
def download_document(doc_id):
    try:
        # Get credentials
        username = request.args.get('username')
        password = request.args.get('password')
        
        if not username or not password:
            return jsonify({'error': 'Authentication required'}), 401
        
        user = authenticate_user(username, password)
        if not user:
            return jsonify({'error': 'Invalid credentials'}), 401
        
        document = Document.query.get_or_404(doc_id)
        
        # Check permissions
        if user.role != 'admin' and user.department != document.department:
            return jsonify({'error': 'Access denied'}), 403
        
        # Check if file is in S3 or local
        if document.file_path.startswith('https://'):
            # File is in S3 - generate presigned URL
            s3_key = document.file_path.split(f'https://{AWS_S3_BUCKET}.s3.{AWS_REGION}.amazonaws.com/')[-1]
            s3_client = get_s3_client()
            presigned_url = s3_client.generate_presigned_url(
                'get_object',
                Params={
                    'Bucket': AWS_S3_BUCKET,
                    'Key': s3_key
                },
                ExpiresIn=3600  # URL expires in 1 hour
            )
            
            # Increment download count
            document.downloads += 1
            db.session.commit()
            
            return jsonify({
                'download_url': presigned_url,
                'filename': document.filename
            })
        else:
            # File is local
            from flask import send_file
            document.downloads += 1
            db.session.commit()
            return send_file(document.file_path, as_attachment=True, download_name=document.filename)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@doc_bp.route('/documents/<int:doc_id>/presigned-url', methods=['GET'])
def get_presigned_url(doc_id):
    try:
        # Get credentials
        username = request.args.get('username')
        password = request.args.get('password')
        
        if not username or not password:
            return jsonify({'error': 'Authentication required'}), 401
        
        user = authenticate_user(username, password)
        if not user:
            return jsonify({'error': 'Invalid credentials'}), 401
        
        document = Document.query.get_or_404(doc_id)
        
        # Check permissions
        if user.role != 'admin' and user.department != document.department:
            return jsonify({'error': 'Access denied'}), 403
        
        # Check if file is in S3
        if not document.file_path.startswith('https://'):
            return jsonify({'error': 'File is not stored in S3'}), 400
        
        # Extract filename from S3 URL
        s3_key = document.file_path.split(f'https://{AWS_S3_BUCKET}.s3.{AWS_REGION}.amazonaws.com/')[-1]
        
        # Generate presigned URL
        s3_client = get_s3_client()
        presigned_url = s3_client.generate_presigned_url(
            'get_object',
            Params={
                'Bucket': AWS_S3_BUCKET,
                'Key': s3_key
            },
            ExpiresIn=3600  # URL expires in 1 hour
        )
        
        return jsonify({
            'presigned_url': presigned_url,
            'filename': document.filename
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/users', methods=['GET'])
@auth_required(required_role='admin')
def get_users():
    try:
        users = User.query.all()
        return jsonify([u.to_dict() for u in users])
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/users/<int:user_id>', methods=['PUT'])
@auth_required(required_role='admin')
def update_user(user_id):
    try:
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

# Health check endpoint
@auth_bp.route('/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy', 'service': 'InfraDoc API'})