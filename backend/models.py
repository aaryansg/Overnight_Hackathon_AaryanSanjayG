# models.py - Updated with ProcessedDocument model
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import bcrypt
import json

db = SQLAlchemy()

class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(200), nullable=False)
    department = db.Column(db.String(50), nullable=False)
    role = db.Column(db.String(50), default='user')
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    documents = db.relationship('Document', backref='uploader', lazy=True)
    processed_docs = db.relationship('ProcessedDocument', backref='processor', lazy=True)
    
    def set_password(self, password):
        self.password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    def check_password(self, password):
        return bcrypt.checkpw(password.encode('utf-8'), self.password_hash.encode('utf-8'))
    
    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'department': self.department,
            'role': self.role,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat()
        }

class Document(db.Model):
    __tablename__ = 'documents'
    
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    filename = db.Column(db.String(255), nullable=False)
    file_path = db.Column(db.String(500), nullable=False)
    file_size = db.Column(db.Integer)
    file_type = db.Column(db.String(50))
    department = db.Column(db.String(50), nullable=False)
    category = db.Column(db.String(50))
    tags = db.Column(db.String(500))
    uploaded_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    status = db.Column(db.String(20), default='active')
    views = db.Column(db.Integer, default=0)
    downloads = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'filename': self.filename,
            'file_size': self.file_size,
            'file_type': self.file_type,
            'department': self.department,
            'category': self.category,
            'tags': self.tags.split(',') if self.tags else [],
            'uploaded_by': self.uploaded_by,
            'uploader_name': self.uploader.username if self.uploader else None,
            'status': self.status,
            'views': self.views,
            'downloads': self.downloads,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class ProcessedDocument(db.Model):
    __tablename__ = 'processed_documents'
    
    id = db.Column(db.Integer, primary_key=True)
    original_filename = db.Column(db.String(255), nullable=False)
    processed_filename = db.Column(db.String(255), nullable=False)
    file_path = db.Column(db.String(500), nullable=False)
    document_type = db.Column(db.String(50), nullable=False)
    department = db.Column(db.String(50), nullable=False)
    summary = db.Column(db.Text)
    key_points = db.Column(db.Text)  # JSON string
    action_items = db.Column(db.Text)  # JSON string
    deadline = db.Column(db.String(50))
    priority = db.Column(db.String(20), default='medium')
    doc_metadata = db.Column(db.Text)  # Renamed from 'metadata' to avoid conflict
    processed_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    processed_date = db.Column(db.DateTime, default=datetime.utcnow)
    status = db.Column(db.String(20), default='processed')
    
    def to_dict(self):
        return {
            'id': self.id,
            'original_filename': self.original_filename,
            'processed_filename': self.processed_filename,
            'document_type': self.document_type,
            'department': self.department,
            'summary': self.summary,
            'key_points': json.loads(self.key_points) if self.key_points else [],
            'action_items': json.loads(self.action_items) if self.action_items else [],
            'deadline': self.deadline,
            'priority': self.priority,
            'metadata': json.loads(self.doc_metadata) if self.doc_metadata else {},  # Use doc_metadata here
            'processed_by': self.processed_by,
            'processor_name': self.processor.username if self.processor else None,
            'processed_date': self.processed_date.isoformat() if self.processed_date else None,
            'status': self.status
        }