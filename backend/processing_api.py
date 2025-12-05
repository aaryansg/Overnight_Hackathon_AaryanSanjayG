# processing_api.py - API endpoints for document processing
from flask import Blueprint, request, jsonify, session, current_app
import os
import uuid
from werkzeug.utils import secure_filename
from models import db, Document, User, ProcessedDocument
from model import batch_process_documents, DocumentProcessingResult
from datetime import datetime
import json

processing_bp = Blueprint('processing', __name__)

ALLOWED_EXTENSIONS = {'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'jpg', 'jpeg', 'png'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def login_required(f):
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({'error': 'Please login first'}), 401
        return f(*args, **kwargs)
    decorated_function.__name__ = f.__name__
    return decorated_function

@processing_bp.route('/process-documents', methods=['POST'])
@login_required
def process_documents():
    """Process uploaded documents and route to departments"""
    try:
        user = User.query.get(session['user_id'])
        
        if user.role != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        
        if 'files[]' not in request.files:
            return jsonify({'error': 'No files uploaded'}), 400
        
        files = request.files.getlist('files[]')
        if not files or files[0].filename == '':
            return jsonify({'error': 'No files selected'}), 400
        
        # Save uploaded files temporarily
        temp_files = []
        for file in files:
            if not allowed_file(file.filename):
                continue
            
            filename = secure_filename(file.filename)
            unique_filename = f"{uuid.uuid4().hex}_{filename}"
            temp_path = os.path.join('temp_uploads', unique_filename)
            
            # Ensure temp directory exists
            os.makedirs('temp_uploads', exist_ok=True)
            
            file.save(temp_path)
            temp_files.append(temp_path)
        
        if not temp_files:
            return jsonify({'error': 'No valid files to process'}), 400
        
        # Process documents
        results_by_department = batch_process_documents(temp_files)
        
        # Save processed documents to database and organize in folders
        processed_results = []
        
        for department, results in results_by_department.items():
            if not results:
                continue
            
            # Create department folder if it doesn't exist
            dept_folder = os.path.join('processed_docs', department.value)
            os.makedirs(dept_folder, exist_ok=True)
            
            for result in results:
                # Move file to department folder
                new_path = os.path.join(dept_folder, result.processed_filename)
                os.rename(result.file_path, new_path)
                
                # Save to database
                processed_doc = ProcessedDocument(
                    original_filename=result.original_filename,
                    processed_filename=result.processed_filename,
                    file_path=new_path,
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
                processed_results.append({
                    'original_filename': result.original_filename,
                    'processed_filename': result.processed_filename,
                    'department': result.department.value,
                    'document_type': result.document_type.value,
                    'priority': result.priority,
                    'summary': result.summary[:200] + '...' if len(result.summary) > 200 else result.summary
                })
        
        db.session.commit()
        
        # Cleanup temp directory
        import shutil
        if os.path.exists('temp_uploads'):
            shutil.rmtree('temp_uploads')
        
        return jsonify({
            'message': f'Processed {len(processed_results)} documents',
            'results': processed_results,
            'summary': {
                'total_processed': len(processed_results),
                'by_department': {dept.value: len(results) for dept, results in results_by_department.items() if results}
            }
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@processing_bp.route('/department-documents/<department>', methods=['GET'])
@login_required
def get_department_documents(department):
    """Get documents for a specific department"""
    try:
        user = User.query.get(session['user_id'])
        
        # Check if user has access to this department
        if user.role != 'admin' and user.department != department:
            return jsonify({'error': 'Access denied'}), 403
        
        # Get documents for this department
        documents = ProcessedDocument.query.filter_by(
            department=department,
            status='processed'
        ).order_by(ProcessedDocument.processed_date.desc()).all()
        
        return jsonify([{
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
            'status': doc.status
        } for doc in documents])
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@processing_bp.route('/document/<int:doc_id>', methods=['GET'])
@login_required
def get_document_details(doc_id):
    """Get detailed information about a processed document"""
    try:
        user = User.query.get(session['user_id'])
        
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
            'metadata': json.loads(document.metadata) if document.metadata else {},
            'processed_date': document.processed_date.isoformat() if document.processed_date else None,
            'file_path': document.file_path,
            'status': document.status
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500