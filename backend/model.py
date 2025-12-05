# model.py - Updated for departmental processing
import os
import json
import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, asdict
import PyPDF2
from enum import Enum
from pypdf import PdfReader
import re
import warnings
warnings.filterwarnings('ignore')

# Hugging Face Inference API
from huggingface_hub import InferenceClient
import getpass
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

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

@dataclass
class CalendarEvent:
    title: str
    description: str
    date: str
    department: str
    priority: str
    action_required: bool

# Helper function for LLM calls
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

# File extraction functions
def extract_text_from_file(file_path: str) -> str:
    """Extract text from file - handles both PDF and text files"""
    _, file_extension = os.path.splitext(file_path.lower())
    
    if file_extension == '.pdf':
        return extract_text_from_pdf(file_path)
    elif file_extension in ['.txt', '.md', '.rtf']:
        return extract_text_from_txt(file_path)
    elif file_extension in ['.docx', '.doc']:
        return extract_text_from_docx(file_path)
    else:
        return f"Unsupported file format: {file_extension}"

def extract_text_from_pdf(file_path: str) -> str:
    """Extract text from PDF"""
    text = ""
    try:
        reader = PdfReader(file_path)
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
    except Exception as e:
        print(f"PDF extraction error: {e}")
        text = f"Error extracting PDF text: {e}"
    
    return text if text else "No text could be extracted from PDF"

def extract_text_from_txt(file_path: str) -> str:
    """Extract text from text file"""
    try:
        with open(file_path, 'r', encoding='utf-8') as file:
            return file.read()
    except UnicodeDecodeError:
        try:
            with open(file_path, 'r', encoding='latin-1') as file:
                return file.read()
        except Exception as e:
            return f"Error reading text file: {e}"
    except Exception as e:
        return f"Error reading file: {e}"

def extract_text_from_docx(file_path: str) -> str:
    """Extract text from DOCX files"""
    try:
        import docx
        doc = docx.Document(file_path)
        return "\n".join([paragraph.text for paragraph in doc.paragraphs])
    except ImportError:
        return "python-docx library not installed"
    except Exception as e:
        return f"Error reading DOCX file: {e}"

def classify_document(text: str) -> DocumentType:
    """Classify document type using LLM"""
    prompt = f"""
    Analyze the following document text and classify it as exactly one of these types:
    - invoice (bills, payments, financial transactions)
    - technical_documentation (engineering specs, designs, technical reports)
    - project_timeline (schedules, milestones, deadlines)
    - safety_report (safety incidents, hazard reports, risk assessments)
    - compliance_document (regulatory compliance, audits, certifications)
    - hr_document (employee records, contracts, policies, training)
    - engineering_report (structural analysis, maintenance reports, engineering studies)
    - operations_manual (operating procedures, manuals, guidelines)
    - procurement_order (purchase orders, procurement documents, vendor contracts)
    - administrative (administrative memos, general correspondence, meeting minutes)
    
    Return ONLY the type name from the list above.
    
    Document text: {text[:2000]}
    
    Document type:
    """
    
    response = call_llm(prompt, max_tokens=50)
    
    if response:
        result = response.lower().strip().replace('"', '').replace("'", "")
        try:
            return DocumentType(result)
        except ValueError:
            # Try to find a match
            for doc_type in DocumentType:
                if doc_type.value in result:
                    return doc_type
    
    # Fallback to rule-based classification
    text_lower = text[:5000].lower()
    if any(word in text_lower for word in ["invoice", "bill", "payment", "amount due", "total:", "$", "purchase order"]):
        return DocumentType.INVOICE
    elif any(word in text_lower for word in ["technical", "specification", "engineering", "design", "requirement", "structural"]):
        return DocumentType.TECHNICAL_DOC
    elif any(word in text_lower for word in ["timeline", "schedule", "milestone", "deadline", "gantt"]):
        return DocumentType.TIMELINE
    elif any(word in text_lower for word in ["safety", "incident", "hazard", "risk assessment", "accident"]):
        return DocumentType.SAFETY_REPORT
    elif any(word in text_lower for word in ["compliance", "regulation", "standard", "audit", "certification"]):
        return DocumentType.COMPLIANCE_DOC
    elif any(word in text_lower for word in ["employee", "hr", "human resources", "contract", "policy", "training"]):
        return DocumentType.HR_DOCUMENT
    else:
        return DocumentType.UNKNOWN

def determine_department(doc_type: DocumentType, text: str) -> Department:
    """Determine which department should handle this document"""
    prompt = f"""
    DETERMINE DEPARTMENT FOR DOCUMENT:
    
    Document type: {doc_type.value}
    Document excerpt: {text[:1500]}
    
    Which department should handle this document? Choose from: 
    engineering, operations, procurement, hr, safety, compliance, admin, finance, management
    
    Return your response in this EXACT JSON format:
    {{"department": "engineering"}}
    
    Return ONLY the JSON, nothing else.
    """
    
    response = call_llm(prompt, system_message="You are a document routing assistant. Always respond with valid JSON.", max_tokens=100)
    
    try:
        if response:
            response = response.strip()
            json_start = response.find('{')
            json_end = response.rfind('}') + 1
            
            if json_start != -1 and json_end > json_start:
                json_str = response[json_start:json_end]
                data = json.loads(json_str)
                dept_str = data.get("department", "").lower()
                
                dept_map = {
                    "engineering": Department.ENGINEERING,
                    "operations": Department.OPERATIONS,
                    "procurement": Department.PROCUREMENT,
                    "hr": Department.HR,
                    "safety": Department.SAFETY,
                    "compliance": Department.COMPLIANCE,
                    "admin": Department.ADMIN,
                    "finance": Department.FINANCE,
                    "management": Department.MANAGEMENT
                }
                
                if dept_str in dept_map:
                    return dept_map[dept_str]
    except Exception as e:
        print(f"Error determining department with LLM: {e}")
    
    # Fallback routing based on document type
    department_mapping = {
        DocumentType.INVOICE: Department.FINANCE,
        DocumentType.TECHNICAL_DOC: Department.ENGINEERING,
        DocumentType.TIMELINE: Department.OPERATIONS,
        DocumentType.SAFETY_REPORT: Department.SAFETY,
        DocumentType.COMPLIANCE_DOC: Department.COMPLIANCE,
        DocumentType.HR_DOCUMENT: Department.HR,
        DocumentType.ENGINEERING_REPORT: Department.ENGINEERING,
        DocumentType.OPERATIONS_MANUAL: Department.OPERATIONS,
        DocumentType.PROCUREMENT_ORDER: Department.PROCUREMENT,
        DocumentType.ADMINISTRATIVE: Department.ADMIN,
        DocumentType.UNKNOWN: Department.ADMIN
    }
    
    return department_mapping.get(doc_type, Department.ADMIN)

def create_summary(text: str, doc_type: DocumentType) -> str:
    """Create intelligent summary"""
    prompt = f"""
    Create a comprehensive summary of this {doc_type.value} document.
    Focus on the most important information for department staff.
    Keep the summary concise but informative (2-3 paragraphs).
    
    Document: {text[:3000]}
    
    Summary:
    """
    
    response = call_llm(prompt, max_tokens=400)
    
    if response:
        return response
    
    # Fallback summary
    lines = [line.strip() for line in text.split('\n') if len(line.strip()) > 30]
    summary_lines = lines[:3]
    return f"Summary of {doc_type.value}:\n" + "\n".join(summary_lines)

def extract_key_points(text: str) -> List[str]:
    """Extract key points from document"""
    prompt = f"""
    Extract 3-5 key points from this document.
    Each point should be concise and actionable.
    
    Document: {text[:2000]}
    
    Return your response in this EXACT JSON format:
    {{"key_points": ["Point 1", "Point 2", "Point 3"]}}
    
    Return ONLY the JSON, nothing else.
    """
    
    response = call_llm(prompt, system_message="You are a document analysis assistant. Always respond with valid JSON.", max_tokens=300)
    
    try:
        if response:
            response = response.strip()
            json_start = response.find('{')
            json_end = response.rfind('}') + 1
            
            if json_start != -1 and json_end > json_start:
                json_str = response[json_start:json_end]
                data = json.loads(json_str)
                points = data.get("key_points", [])
                return [str(point) for point in points[:5]]
    except Exception as e:
        print(f"Error extracting key points: {e}")
    
    return ["Document processed. Manual review recommended."]

def extract_action_items(text: str) -> List[str]:
    """Extract action items"""
    prompt = f"""
    Extract action items from this document.
    Focus on tasks that need to be completed.
    
    Document: {text[:2000]}
    
    Return your response in this EXACT JSON format:
    {{"action_items": ["Action 1", "Action 2", "Action 3"]}}
    
    Return ONLY the JSON, nothing else.
    """
    
    response = call_llm(prompt, system_message="You are a document analysis assistant. Always respond with valid JSON.", max_tokens=300)
    
    try:
        if response:
            response = response.strip()
            json_start = response.find('{')
            json_end = response.rfind('}') + 1
            
            if json_start != -1 and json_end > json_start:
                json_str = response[json_start:json_end]
                data = json.loads(json_str)
                items = data.get("action_items", [])
                return [str(item) for item in items[:5]]
    except Exception as e:
        print(f"Error extracting action items: {e}")
    
    return []

def extract_deadline(text: str) -> Optional[str]:
    """Extract deadline or due date"""
    date_patterns = [
        r'(\d{4}-\d{2}-\d{2})',
        r'(\d{2}/\d{2}/\d{4})',
        r'(\d{2}-\d{2}-\d{4})',
        r'(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2},\s+\d{4}',
    ]
    
    for pattern in date_patterns:
        matches = re.findall(pattern, text[:1000], re.IGNORECASE)
        if matches:
            return matches[0]
    
    # Check for deadline keywords
    deadline_keywords = ["due by", "deadline", "submit by", "complete by", "by"]
    for keyword in deadline_keywords:
        if keyword in text.lower():
            # Extract the date after the keyword
            idx = text.lower().find(keyword)
            substr = text[idx:idx+100]
            for pattern in date_patterns:
                match = re.search(pattern, substr, re.IGNORECASE)
                if match:
                    return match.group(0)
    
    return None

def determine_priority(text: str) -> str:
    """Determine document priority"""
    text_lower = text.lower()
    
    high_priority_keywords = ["urgent", "emergency", "critical", "immediate", "asap", "high priority"]
    medium_priority_keywords = ["important", "attention", "review", "consider", "medium priority"]
    
    if any(keyword in text_lower for keyword in high_priority_keywords):
        return "high"
    elif any(keyword in text_lower for keyword in medium_priority_keywords):
        return "medium"
    else:
        return "low"

def process_document_for_department(file_path: str, original_filename: str) -> DocumentProcessingResult:
    """Main function to process a document for departmental routing"""
    print(f"🚀 Processing document: {original_filename}")
    
    try:
        # Extract text
        raw_text = extract_text_from_file(file_path)
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
        
        # Generate new filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        processed_filename = f"{department.value}_{timestamp}_{uuid.uuid4().hex[:8]}_{original_filename}"
        
        # Create metadata
        doc_metadata = {  # Changed from 'metadata' to 'doc_metadata'
        'original_filename': original_filename,
        'processed_date': datetime.now().isoformat(),
        'document_type': doc_type.value,
        'department': department.value,
        'text_length': len(raw_text),
        'priority': priority,
        'has_deadline': deadline is not None,
        'key_points_count': len(key_points),
        'action_items_count': len(action_items)
    }
        
        print(f"\n✅ Document processing complete!")
        
        return DocumentProcessingResult(
            file_path=file_path,
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
            raw_text=raw_text[:1000],  # Store first 1000 chars
            processed_date=datetime.now().isoformat()
        )
        
    except Exception as e:
        print(f"❌ Error processing document: {e}")
        raise

def batch_process_documents(file_paths: List[str]) -> Dict[Department, List[DocumentProcessingResult]]:
    """Process multiple documents and organize by department"""
    results_by_department = {dept: [] for dept in Department}
    
    for file_path in file_paths:
        try:
            original_filename = os.path.basename(file_path)
            result = process_document_for_department(file_path, original_filename)
            results_by_department[result.department].append(result)
        except Exception as e:
            print(f"Failed to process {file_path}: {e}")
    
    return results_by_department

# Test function
def test_document_processing():
    """Test the document processing system"""
    print("🧪 Testing document processing system...")
    
    # Create a test document
    test_doc = """
    SAFETY INCIDENT REPORT
    Date: 2024-03-15
    Location: Main Construction Site - Building A
    
    INCIDENT DESCRIPTION:
    A minor scaffolding incident occurred at 10:30 AM on March 15, 2024.
    Worker John Smith slipped on wet surface but was caught by safety harness.
    No injuries reported.
    
    IMMEDIATE ACTIONS TAKEN:
    1. Area secured and marked with caution tape
    2. Wet surface identified and dried
    3. Safety briefing conducted with team
    
    REQUIRED FOLLOW-UP:
    1. Complete incident report by March 18, 2024
    2. Review scaffolding safety procedures
    3. Conduct additional safety training
    
    DEADLINE: March 20, 2024 for all corrective actions
    
    URGENT: Requires immediate attention from Safety Department
    """
    
    # Save test document
    test_path = "test_safety_report.txt"
    with open(test_path, 'w') as f:
        f.write(test_doc)
    
    try:
        result = process_document_for_department(test_path, "test_safety_report.txt")
        
        print(f"\n📊 RESULTS:")
        print(f"Document Type: {result.document_type.value}")
        print(f"Department: {result.department.value}")
        print(f"Priority: {result.priority}")
        print(f"Deadline: {result.deadline}")
        print(f"\nSummary: {result.summary[:200]}...")
        print(f"\nKey Points: {result.key_points}")
        print(f"\nAction Items: {result.action_items}")
        
        # Clean up
        os.remove(test_path)
        
    except Exception as e:
        print(f"Test failed: {e}")

if __name__ == "__main__":
    print("=" * 60)
    print("🏗️  INTELLIGENT DOCUMENT PROCESSING SYSTEM")
    print("=" * 60)
    print("\nAutomated departmental document routing and processing")
    
    # Test the system
    test_document_processing()