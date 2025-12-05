from flask import Blueprint, request, jsonify
import os
import uuid
import json
from datetime import datetime
from werkzeug.utils import secure_filename
from models import db, Document, User, ProcessedDocument
from model import (
    batch_process_s3_documents, 
    auto_fetch_and_process,
    process_s3_document,
    list_s3_documents,
    download_from_s3,
    DocumentProcessingResult
)

processing_bp = Blueprint('processing', __name__)

ALLOWED_EXTENSIONS = {'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'jpg', 'jpeg', 'png'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# Simple auth helper for processing API
def authenticate_user_from_request():
    """Extract and authenticate user from request"""
    # Try to get credentials from various sources
    username = None
    password = None
    
    # Try JSON body
    data = request.get_json(silent=True)
    if data:
        username = data.get('username')
        password = data.get('password')
    
    # Try form data
    if not username or not password:
        username = request.form.get('username')
        password = request.form.get('password')
    
    # Try query parameters
    if not username or not password:
        username = request.args.get('username')
        password = request.args.get('password')
    
    if not username or not password:
        return None
    
    user = User.query.filter_by(username=username).first()
    if not user or not user.check_password(password):
        return None
    
    if not user.is_active:
        return None
    
    return user

def auth_required_api(required_role=None):
    def decorator(f):
        def wrapper(*args, **kwargs):
            user = authenticate_user_from_request()
            if not user:
                return jsonify({'error': 'Authentication required'}), 401
            
            if required_role and user.role != required_role:
                return jsonify({'error': 'Admin access required'}), 403
            
            request.user = user
            return f(*args, **kwargs)
        wrapper.__name__ = f.__name__
        return wrapper
    return decorator

@processing_bp.route('/auto-process', methods=['POST'])
@auth_required_api(required_role='admin')
def auto_process_documents():
    try:
        user = request.user
        
        data = request.get_json() or {}
        department = data.get('department')
        
        result = auto_fetch_and_process(department)
        
        if 'error' in result:
            return jsonify({'error': result['error']}), 500
        
        if 'documents' in result:
            for doc_data in result['documents']:
                existing = ProcessedDocument.query.filter_by(
                    original_filename=doc_data['original_filename']
                ).first()
                
                if not existing:
                    processed_doc = ProcessedDocument(
                        original_filename=doc_data['original_filename'],
                        processed_filename=f"processed_{doc_data['original_filename']}",
                        file_path=doc_data.get('s3_url', ''),
                        document_type=doc_data['document_type'],
                        department=doc_data['department'],
                        summary='',
                        key_points=json.dumps([]),
                        action_items=json.dumps([]),
                        priority=doc_data['priority'],
                        processed_by=user.id,
                        status='pending_processing'
                    )
                    
                    db.session.add(processed_doc)
        
        db.session.commit()
        
        return jsonify({
            'message': result.get('message', 'Processing completed'),
            'total_processed': result.get('total_processed', 0),
            'by_department': result.get('by_department', {}),
            'documents': result.get('documents', [])
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@processing_bp.route('/process-s3-document', methods=['POST'])
def process_s3_document_api():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Get credentials
        username = data.get('username')
        password = data.get('password')
        
        if not username or not password:
            return jsonify({'error': 'Authentication required'}), 401
        
        user = User.query.filter_by(username=username).first()
        if not user or not user.check_password(password):
            return jsonify({'error': 'Invalid credentials'}), 401
        
        if user.role != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        
        s3_key = data.get('s3_key')
        if not s3_key:
            return jsonify({'error': 'S3 key required'}), 400
        
        # Process the document
        result = process_s3_document(s3_key)
        
        # Save to database
        processed_doc = ProcessedDocument(
            original_filename=result.original_filename,
            processed_filename=result.processed_filename,
            file_path=result.s3_url,
            document_type=result.document_type.value,
            department=result.department.value,
            summary=result.summary,
            key_points=json.dumps(result.key_points),
            action_items=json.dumps(result.action_items),
            deadline=result.deadline,
            priority=result.priority,
            doc_metadata=json.dumps(result.metadata),
            processed_by=user.id,
            status='processed'
        )
        
        db.session.add(processed_doc)
        db.session.commit()
        
        return jsonify({
            'message': 'Document processed successfully',
            'document': {
                'id': processed_doc.id,
                'original_filename': result.original_filename,
                'department': result.department.value,
                'document_type': result.document_type.value,
                'priority': result.priority,
                'summary': result.summary[:200] + '...' if len(result.summary) > 200 else result.summary,
                's3_url': result.s3_url
            }
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@processing_bp.route('/list-s3-documents', methods=['GET'])
def list_s3_documents_api():
    try:
        # Get credentials
        username = request.args.get('username')
        password = request.args.get('password')
        
        if not username or not password:
            return jsonify({'error': 'Authentication required'}), 401
        
        user = User.query.filter_by(username=username).first()
        if not user or not user.check_password(password):
            return jsonify({'error': 'Invalid credentials'}), 401
        
        if user.role != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        
        department = request.args.get('department')
        limit = request.args.get('limit', 50, type=int)
        
        # List documents from S3
        documents = list_s3_documents(department, limit)
        
        return jsonify({
            'documents': documents,
            'total': len(documents)
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@processing_bp.route('/department-documents/<department>', methods=['GET'])
def get_department_documents(department):
    try:
        # Get credentials
        username = request.args.get('username')
        password = request.args.get('password')
        
        if not username or not password:
            return jsonify({'error': 'Authentication required'}), 401
        
        user = User.query.filter_by(username=username).first()
        if not user or not user.check_password(password):
            return jsonify({'error': 'Invalid credentials'}), 401
        
        # Check if user has access to this department
        if user.role != 'admin' and user.department != department:
            return jsonify({'error': 'Access denied'}), 403
        
        # Get documents for this department from database
        documents = ProcessedDocument.query.filter_by(
            department=department,
            status='processed'
        ).order_by(ProcessedDocument.processed_date.desc()).all()
        
        # Also fetch from S3 for real-time data
        s3_docs = list_s3_documents(department)
        
        # Combine database and S3 documents
        all_documents = []
        
        # Add database documents
        for doc in documents:
            all_documents.append({
                'id': doc.id,
                'original_filename': doc.original_filename,
                'processed_filename': doc.processed_filename,
                'document_type': doc.document_type,
                'department': doc.department,
                'summary': doc.summary,
                'key_points': json.loads(doc.key_points) if doc.key_points else [],
                'action_items': json.loads(doc.action_items) if doc.action_items else [],
                'deadline': doc.deadline,
                'priority': doc.priority,
                'processed_date': doc.processed_date.isoformat() if doc.processed_date else None,
                'processed_by': doc.processed_by,
                'status': doc.status,
                'file_path': doc.file_path,
                'source': 'database'
            })
        
        # Add S3 documents that aren't in database
        s3_filenames = [d['original_filename'] for d in all_documents]
        for s3_doc in s3_docs:
            if os.path.basename(s3_doc['key']) not in s3_filenames:
                all_documents.append({
                    'id': None,
                    'original_filename': os.path.basename(s3_doc['key']),
                    'document_type': s3_doc.get('document_type', 'unknown'),
                    'department': s3_doc.get('department', 'unknown'),
                    'summary': 'Document is in S3 but not yet fully processed',
                    'key_points': [],
                    'action_items': [],
                    'priority': 'medium',
                    'processed_date': s3_doc.get('last_modified'),
                    'status': 'in_s3',
                    'source': 's3',
                    's3_url': s3_doc.get('url'),
                    's3_key': s3_doc.get('key')
                })
        
        return jsonify(all_documents)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@processing_bp.route('/document/<int:doc_id>', methods=['GET'])
def get_document_details(doc_id):
    try:
        # Get credentials
        username = request.args.get('username')
        password = request.args.get('password')
        
        if not username or not password:
            return jsonify({'error': 'Authentication required'}), 401
        
        user = User.query.filter_by(username=username).first()
        if not user or not user.check_password(password):
            return jsonify({'error': 'Invalid credentials'}), 401
        
        document = ProcessedDocument.query.get_or_404(doc_id)
        
        # Check permissions
        if user.role != 'admin' and user.department != document.department:
            return jsonify({'error': 'Access denied'}), 403
        
        return jsonify({
            'id': document.id,
            'original_filename': document.original_filename,
            'processed_filename': document.processed_filename,
            'document_type': document.document_type,
            'department': document.department,
            'summary': document.summary,
            'key_points': json.loads(document.key_points) if document.key_points else [],
            'action_items': json.loads(document.action_items) if document.action_items else [],
            'deadline': document.deadline,
            'priority': document.priority,
            'metadata': json.loads(document.doc_metadata) if document.doc_metadata else {},
            'processed_date': document.processed_date.isoformat() if document.processed_date else None,
            'file_path': document.file_path,
            'status': document.status
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@processing_bp.route('/documents/summary', methods=['GET'])
def get_documents_summary():
    try:
        # Get credentials
        username = request.args.get('username')
        password = request.args.get('password')
        
        if not username or not password:
            return jsonify({'error': 'Authentication required'}), 401
        
        user = User.query.filter_by(username=username).first()
        if not user or not user.check_password(password):
            return jsonify({'error': 'Invalid credentials'}), 401
        
        if user.role != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        
        # Get database documents
        db_documents = ProcessedDocument.query.all()
        
        # Get S3 documents
        s3_documents = list_s3_documents()
        
        # Calculate statistics
        total_documents = len(db_documents) + len(s3_documents)
        
        # Department distribution from database
        departments_db = {}
        for doc in db_documents:
            if doc.department not in departments_db:
                departments_db[doc.department] = 0
            departments_db[doc.department] += 1
        
        # Department distribution from S3
        departments_s3 = {}
        for doc in s3_documents:
            dept = doc.get('department', 'unknown')
            if dept not in departments_s3:
                departments_s3[dept] = 0
            departments_s3[dept] += 1
        
        # Combine departments
        all_departments = set(list(departments_db.keys()) + list(departments_s3.keys()))
        department_distribution = {
            dept: departments_db.get(dept, 0) + departments_s3.get(dept, 0)
            for dept in all_departments
        }
        
        # Recent activity
        recent_docs = ProcessedDocument.query.order_by(
            ProcessedDocument.processed_date.desc()
        ).limit(10).all()
        
        recent_activity = []
        for doc in recent_docs:
            uploader = User.query.get(doc.processed_by)
            recent_activity.append({
                'id': doc.id,
                'action': f'Processed {doc.original_filename}',
                'user': uploader.username if uploader else 'System',
                'time': doc.processed_date.isoformat() if doc.processed_date else None,
                'department': doc.department
            })
        
        return jsonify({
            'total_documents': total_documents,
            'database_documents': len(db_documents),
            's3_documents': len(s3_documents),
            'departments': list(all_departments),
            'by_department': department_distribution,
            'recent_activity': recent_activity
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@processing_bp.route('/trigger-processing', methods=['POST'])
def trigger_processing():
    try:
        data = request.get_json() or {}
        
        # Get credentials from request
        username = data.get('username')
        password = data.get('password')
        
        if not username or not password:
            return jsonify({'error': 'Authentication required'}), 401
        
        user = User.query.filter_by(username=username).first()
        if not user or not user.check_password(password):
            return jsonify({'error': 'Invalid credentials'}), 401
        
        if user.role != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        
        department = data.get('department')
        result = auto_fetch_and_process(department)
        
        return jsonify({
            'message': 'Processing triggered',
            'result': result
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@processing_bp.route('/download-document/<int:doc_id>', methods=['GET'])
def download_document(doc_id):
    try:
        # Get credentials
        username = request.args.get('username')
        password = request.args.get('password')
        
        if not username or not password:
            return jsonify({'error': 'Authentication required'}), 401
        
        user = User.query.filter_by(username=username).first()
        if not user or not user.check_password(password):
            return jsonify({'error': 'Invalid credentials'}), 401
        
        document = ProcessedDocument.query.get_or_404(doc_id)
        
        # Check permissions
        if user.role != 'admin' and user.department != document.department:
            return jsonify({'error': 'Access denied'}), 403
        
        # Check if file is in S3
        if document.file_path and document.file_path.startswith('http'):
            # File is in S3, return the URL
            return jsonify({
                'download_url': document.file_path,
                'filename': document.original_filename
            })
        elif os.path.exists(document.file_path):
            # File is local, return file path
            from flask import send_file
            return send_file(document.file_path, as_attachment=True, download_name=document.original_filename)
        else:
            return jsonify({'error': 'File not found'}), 404
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@processing_bp.route('/get-s3-url/<s3_key>', methods=['GET'])
def get_s3_url(s3_key):
    try:
        # Get credentials
        username = request.args.get('username')
        password = request.args.get('password')
        
        if not username or not password:
            return jsonify({'error': 'Authentication required'}), 401
        
        user = User.query.filter_by(username=username).first()
        if not user or not user.check_password(password):
            return jsonify({'error': 'Invalid credentials'}), 401
        
        # For now, let's allow any authenticated user to access S3 URLs
        
        from model import s3_client, AWS_S3_BUCKET, AWS_REGION
        
        # Generate presigned URL (expires in 1 hour)
        presigned_url = s3_client.generate_presigned_url(
            'get_object',
            Params={
                'Bucket': AWS_S3_BUCKET,
                'Key': s3_key
            },
            ExpiresIn=3600
        )
        
        return jsonify({
            'presigned_url': presigned_url,
            'filename': os.path.basename(s3_key)
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@processing_bp.route('/test-connection', methods=['GET'])
def test_connection():
    return jsonify({
        'status': 'ok',
        'service': 'InfraDoc Processing API',
        'timestamp': datetime.now().isoformat()
    })