# model.py - Updated with S3 integration
import os
import json
import uuid
import boto3
import tempfile
from datetime import datetime
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, asdict
from enum import Enum
import re
import warnings
from dotenv import load_dotenv
from huggingface_hub import InferenceClient
import getpass

warnings.filterwarnings('ignore')

# Load environment variables
load_dotenv()

# AWS S3 Configuration
AWS_S3_BUCKET = os.getenv('AWS_S3_BUCKET')
AWS_REGION = os.getenv('AWS_REGION', 'us-east-1')
AWS_ACCESS_KEY_ID = os.getenv('AWS_ACCESS_KEY_ID')
AWS_SECRET_ACCESS_KEY = os.getenv('AWS_SECRET_ACCESS_KEY')

# Initialize S3 client
s3_client = boto3.client(
    's3',
    aws_access_key_id=AWS_ACCESS_KEY_ID,
    aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
    region_name=AWS_REGION
)

# Initialize Hugging Face Inference Client
hf_token = os.getenv("HF_TOKEN")
if not hf_token:
    hf_token = getpass.getpass("Enter Hugging Face token: ")
    os.environ["HF_TOKEN"] = hf_token

client = InferenceClient(api_key=hf_token)

# Define model to use
MODEL_NAME = "deepseek-ai/DeepSeek-V3.2"

# Define enums and dataclasses
class DocumentType(Enum):
    INVOICE = "invoice"
    TECHNICAL_DOC = "technical_documentation"
    TIMELINE = "project_timeline"
    SAFETY_REPORT = "safety_report"
    COMPLIANCE_DOC = "compliance_document"
    HR_DOCUMENT = "hr_document"
    ENGINEERING_REPORT = "engineering_report"
    OPERATIONS_MANUAL = "operations_manual"
    PROCUREMENT_ORDER = "procurement_order"
    ADMINISTRATIVE = "administrative"
    UNKNOWN = "unknown"

class Department(Enum):
    ENGINEERING = "engineering"
    OPERATIONS = "operations"
    PROCUREMENT = "procurement"
    HR = "hr"
    SAFETY = "safety"
    COMPLIANCE = "compliance"
    ADMIN = "admin"
    FINANCE = "finance"
    MANAGEMENT = "management"

@dataclass
class DocumentProcessingResult:
    file_path: str
    original_filename: str
    processed_filename: str
    document_type: DocumentType
    department: Department
    summary: str
    key_points: List[str]
    action_items: List[str]
    deadline: Optional[str]
    priority: str
    metadata: Dict[str, Any]
    raw_text: str
    processed_date: str
    s3_key: Optional[str] = None
    s3_url: Optional[str] = None

@dataclass
class CalendarEvent:
    title: str
    description: str
    date: str
    department: str
    priority: str
    action_required: bool

# S3 Helper Functions
def download_from_s3(s3_key: str) -> str:
    """Download file from S3 to local temporary file"""
    try:
        # Create a temporary file
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(s3_key)[1])
        temp_path = temp_file.name
        
        # Download from S3
        s3_client.download_file(AWS_S3_BUCKET, s3_key, temp_path)
        
        print(f"✅ Downloaded from S3: {s3_key}")
        return temp_path
        
    except Exception as e:
        print(f"❌ Error downloading from S3: {e}")
        raise

def upload_to_s3(file_path: str, department: str, document_type: str) -> Dict[str, str]:
    """Upload processed file to S3 with department folder structure"""
    try:
        # Extract filename
        filename = os.path.basename(file_path)
        
        # Create S3 key with department folder
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        unique_id = uuid.uuid4().hex[:8]
        s3_key = f"processed/{department}/{document_type}/{timestamp}_{unique_id}_{filename}"
        
        # Upload to S3
        s3_client.upload_file(
            file_path,
            AWS_S3_BUCKET,
            s3_key,
            ExtraArgs={
                'ContentType': 'application/octet-stream',
                'Metadata': {
                    'department': department,
                    'document_type': document_type,
                    'processed_date': datetime.now().isoformat()
                }
            }
        )
        
        # Generate S3 URL
        s3_url = f"https://{AWS_S3_BUCKET}.s3.{AWS_REGION}.amazonaws.com/{s3_key}"
        
        print(f"✅ Uploaded to S3: {s3_key}")
        return {'key': s3_key, 'url': s3_url}
        
    except Exception as e:
        print(f"❌ Error uploading to S3: {e}")
        raise

def list_s3_documents(department: str = None, limit: int = 100) -> List[Dict]:
    """List documents from S3, optionally filtered by department"""
    try:
        prefix = ""
        if department:
            prefix = f"uploads/{department}/"
        
        response = s3_client.list_objects_v2(
            Bucket=AWS_S3_BUCKET,
            Prefix=prefix,
            MaxKeys=limit
        )
        
        documents = []
        if 'Contents' in response:
            for obj in response['Contents']:
                # Skip folders
                if obj['Key'].endswith('/'):
                    continue
                    
                # Extract metadata
                try:
                    head_response = s3_client.head_object(
                        Bucket=AWS_S3_BUCKET,
                        Key=obj['Key']
                    )
                    metadata = head_response.get('Metadata', {})
                except:
                    metadata = {}
                
                documents.append({
                    'key': obj['Key'],
                    'size': obj['Size'],
                    'last_modified': obj['LastModified'].isoformat(),
                    'department': metadata.get('department', 'unknown'),
                    'document_type': metadata.get('document_type', 'unknown'),
                    'url': f"https://{AWS_S3_BUCKET}.s3.{AWS_REGION}.amazonaws.com/{obj['Key']}"
                })
        
        return documents
        
    except Exception as e:
        print(f"❌ Error listing S3 documents: {e}")
        return []

# LLM Helper Functions
def call_llm(prompt: str, system_message: str = None, max_tokens: int = 1000) -> str:
    """Call Hugging Face Inference API"""
    messages = []
    
    if system_message:
        messages.append({"role": "system", "content": system_message})
    
    messages.append({"role": "user", "content": prompt})
    
    try:
        completion = client.chat.completions.create(
            model=MODEL_NAME,
            messages=messages,
            max_tokens=max_tokens,
            temperature=0.3,
        )
        
        response = completion.choices[0].message.content
        return response.strip()
    except Exception as e:
        print(f"Error calling LLM: {e}")
        return ""

# File processing functions (keep existing extract_text_from_file, etc.)

def process_s3_document(s3_key: str) -> DocumentProcessingResult:
    """Process a document directly from S3"""
    print(f"🚀 Processing S3 document: {s3_key}")
    
    try:
        # Download from S3
        local_path = download_from_s3(s3_key)
        original_filename = os.path.basename(s3_key)
        
        # Extract text
        raw_text = extract_text_from_file(local_path)
        print(f"📊 Document size: {len(raw_text)} characters")
        
        # Classify document
        doc_type = classify_document(raw_text)
        print(f"   ✅ Type: {doc_type.value.upper()}")
        
        # Determine department
        department = determine_department(doc_type, raw_text)
        print(f"   ✅ Department: {department.value.upper()}")
        
        # Create summary
        summary = create_summary(raw_text, doc_type)
        print(f"   ✅ Summary created")
        
        # Extract key points
        key_points = extract_key_points(raw_text)
        print(f"   ✅ Key points: {len(key_points)}")
        
        # Extract action items
        action_items = extract_action_items(raw_text)
        print(f"   ✅ Action items: {len(action_items)}")
        
        # Extract deadline
        deadline = extract_deadline(raw_text)
        if deadline:
            print(f"   ✅ Deadline: {deadline}")
        
        # Determine priority
        priority = determine_priority(raw_text)
        print(f"   ✅ Priority: {priority}")
        
        # Generate processed filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        processed_filename = f"{department.value}_{timestamp}_{uuid.uuid4().hex[:8]}_{original_filename}"
        
        # Create metadata
        doc_metadata = {
            'original_filename': original_filename,
            's3_key': s3_key,
            'processed_date': datetime.now().isoformat(),
            'document_type': doc_type.value,
            'department': department.value,
            'text_length': len(raw_text),
            'priority': priority,
            'has_deadline': deadline is not None,
            'key_points_count': len(key_points),
            'action_items_count': len(action_items)
        }
        
        # Upload processed version to S3
        s3_result = upload_to_s3(local_path, department.value, doc_type.value)
        
        # Clean up temporary file
        os.unlink(local_path)
        
        print(f"\n✅ Document processing complete!")
        
        return DocumentProcessingResult(
            file_path=local_path,
            original_filename=original_filename,
            processed_filename=processed_filename,
            document_type=doc_type,
            department=department,
            summary=summary,
            key_points=key_points,
            action_items=action_items,
            deadline=deadline,
            priority=priority,
            metadata=doc_metadata,
            raw_text=raw_text[:1000],
            processed_date=datetime.now().isoformat(),
            s3_key=s3_result['key'],
            s3_url=s3_result['url']
        )
        
    except Exception as e:
        print(f"❌ Error processing S3 document: {e}")
        raise

def batch_process_s3_documents(s3_keys: List[str]) -> Dict[Department, List[DocumentProcessingResult]]:
    """Process multiple documents from S3 and organize by department"""
    results_by_department = {dept: [] for dept in Department}
    
    for s3_key in s3_keys:
        try:
            result = process_s3_document(s3_key)
            results_by_department[result.department].append(result)
        except Exception as e:
            print(f"Failed to process {s3_key}: {e}")
    
    return results_by_department

def auto_fetch_and_process(department: str = None) -> Dict:
    """Automatically fetch unprocessed documents from S3 and process them"""
    try:
        # List all unprocessed documents from S3
        # We'll look in the 'uploads/' prefix for unprocessed documents
        unprocessed_docs = []
        
        response = s3_client.list_objects_v2(
            Bucket=AWS_S3_BUCKET,
            Prefix='uploads/',
            MaxKeys=50
        )
        
        if 'Contents' in response:
            for obj in response['Contents']:
                # Skip if already in processed folder
                if 'processed/' in obj['Key']:
                    continue
                    
                # Filter by department if specified
                if department:
                    # Check if department is in the key path
                    if f"/{department}/" not in obj['Key']:
                        continue
                
                unprocessed_docs.append(obj['Key'])
        
        if not unprocessed_docs:
            return {'message': 'No unprocessed documents found', 'processed': 0}
        
        print(f"📥 Found {len(unprocessed_docs)} unprocessed documents")
        
        # Process documents
        results_by_department = batch_process_s3_documents(unprocessed_docs[:10])  # Limit to 10 at a time
        
        # Move processed documents to archive
        for s3_key in unprocessed_docs[:10]:
            try:
                # Extract filename
                filename = os.path.basename(s3_key)
                
                # Move to archive folder
                archive_key = f"archive/{datetime.now().strftime('%Y/%m/%d')}/{filename}"
                
                # Copy to archive
                s3_client.copy_object(
                    Bucket=AWS_S3_BUCKET,
                    CopySource={'Bucket': AWS_S3_BUCKET, 'Key': s3_key},
                    Key=archive_key
                )
                
                # Delete from uploads
                s3_client.delete_object(
                    Bucket=AWS_S3_BUCKET,
                    Key=s3_key
                )
                
                print(f"📦 Archived: {s3_key} -> {archive_key}")
                
            except Exception as e:
                print(f"❌ Error archiving {s3_key}: {e}")
        
        # Prepare summary
        total_processed = sum(len(docs) for docs in results_by_department.values())
        dept_summary = {dept.value: len(docs) for dept, docs in results_by_department.items() if docs}
        
        return {
            'message': f'Successfully processed {total_processed} documents',
            'total_processed': total_processed,
            'by_department': dept_summary,
            'documents': [
                {
                    'original_filename': result.original_filename,
                    'department': result.department.value,
                    'document_type': result.document_type.value,
                    'priority': result.priority,
                    's3_url': result.s3_url
                }
                for dept_docs in results_by_department.values()
                for result in dept_docs
            ]
        }
        
    except Exception as e:
        print(f"❌ Error in auto-fetch: {e}")
        return {'error': str(e), 'processed': 0}

# Keep existing functions from the original model.py
def extract_text_from_file(file_path: str) -> str:
    """Extract text from file - handles both PDF and text files"""
    # ... (keep existing implementation)

def classify_document(text: str) -> DocumentType:
    """Classify document type using LLM"""
    # ... (keep existing implementation)

def determine_department(doc_type: DocumentType, text: str) -> Department:
    """Determine which department should handle this document"""
    # ... (keep existing implementation)

def create_summary(text: str, doc_type: DocumentType) -> str:
    """Create intelligent summary"""
    # ... (keep existing implementation)

def extract_key_points(text: str) -> List[str]:
    """Extract key points from document"""
    # ... (keep existing implementation)

def extract_action_items(text: str) -> List[str]:
    """Extract action items"""
    # ... (keep existing implementation)

def extract_deadline(text: str) -> Optional[str]:
    """Extract deadline or due date"""
    # ... (keep existing implementation)

def determine_priority(text: str) -> str:
    """Determine document priority"""
    # ... (keep existing implementation)

if __name__ == "__main__":
    print("=" * 60)
    print("🏗️  INTELLIGENT DOCUMENT PROCESSING SYSTEM WITH S3")
    print("=" * 60)
    print("\nAutomated S3 document fetching and processing")
    
    # Test S3 connection
    try:
        print("\n🔍 Testing S3 connection...")
        response = s3_client.list_buckets()
        print(f"✅ Connected to S3. Buckets: {[b['Name'] for b in response['Buckets']]}")
        
        # Test auto-fetch
        print("\n🔄 Testing auto-fetch and process...")
        result = auto_fetch_and_process()
        print(f"Result: {result}")
        
    except Exception as e:
        print(f"❌ S3 connection failed: {e}")