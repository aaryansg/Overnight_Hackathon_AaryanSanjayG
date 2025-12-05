#!/usr/bin/env python3
"""
Initialize database with test users
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import app
from models import db, User

def create_test_users():
    """Create test users for all departments"""
    with app.app_context():
        # Create admin user
        admin = User.query.filter_by(username='admin').first()
        if not admin:
            admin = User(
                username='admin',
                email='admin@infradoc.com',
                department='admin',
                role='admin',
                is_active=True
            )
            admin.set_password('admin123')
            db.session.add(admin)
            print("✅ Created admin user: admin / admin123")
        
        # Create department users
        departments = [
            ('engineer', 'engineer@infradoc.com', 'engineering', 'Engineer123'),
            ('operator', 'operator@infradoc.com', 'operations', 'Operator123'),
            ('procurement', 'procurement@infradoc.com', 'procurement', 'Procurement123'),
            ('safety', 'safety@infradoc.com', 'safety', 'Safety123'),
            ('hr', 'hr@infradoc.com', 'hr', 'Hr123'),
            ('compliance', 'compliance@infradoc.com', 'compliance', 'Compliance123'),
            ('john', 'john.doe@infradoc.com', 'engineering', 'John123'),
            ('sarah', 'sarah@infradoc.com', 'operations', 'Sarah123')
        ]
        
        for username, email, department, password in departments:
            user = User.query.filter_by(username=username).first()
            if not user:
                user = User(
                    username=username,
                    email=email,
                    department=department,
                    role='user',
                    is_active=True
                )
                user.set_password(password)
                db.session.add(user)
                print(f"✅ Created {department} user: {username} / {password}")
        
        db.session.commit()
        print("\n🎉 Database initialized with test users!")

if __name__ == '__main__':
    create_test_users()