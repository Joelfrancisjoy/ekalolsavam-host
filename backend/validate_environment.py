#!/usr/bin/env python
"""
Environment validation script for E-Kalolsavam authentication system.
Validates all required environment variables and configurations.
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def validate_environment():
    """Validate all required environment variables and configurations."""
    errors = []
    warnings = []
    
    print("🔍 Validating E-Kalolsavam Authentication Environment...")
    print("=" * 60)
    
    # Required environment variables
    required_vars = {
        'SECRET_KEY': 'Django secret key for cryptographic signing',
        'DATABASE_NAME': 'Database name for MySQL connection',
        'DATABASE_USER': 'Database username for MySQL connection',
        'DATABASE_PASSWORD': 'Database password for MySQL connection',
        'DATABASE_HOST': 'Database host (default: localhost)',
        'SOCIAL_AUTH_GOOGLE_OAUTH2_KEY': 'Google OAuth2 Client ID',
        'SOCIAL_AUTH_GOOGLE_OAUTH2_SECRET': 'Google OAuth2 Client Secret',
    }
    
    # Optional environment variables with defaults
    optional_vars = {
        'DEBUG': 'Debug mode (default: False)',
        'DATABASE_PORT': 'Database port (default: 3306)',
        'ALLOWED_HOSTS': 'Allowed hosts (default: localhost,127.0.0.1)',
        'USE_SQLITE': 'Use SQLite instead of MySQL (default: False)',
    }
    
    print("📋 Checking Required Environment Variables:")
    print("-" * 40)
    
    for var, description in required_vars.items():
        value = os.getenv(var)
        if not value:
            errors.append(f"❌ {var}: Missing - {description}")
            print(f"❌ {var}: MISSING")
        else:
            # Mask sensitive values
            if 'SECRET' in var or 'PASSWORD' in var:
                display_value = f"{'*' * (len(value) - 4)}{value[-4:]}" if len(value) > 4 else "****"
            else:
                display_value = value
            print(f"✅ {var}: {display_value}")
    
    print("\n📋 Checking Optional Environment Variables:")
    print("-" * 40)
    
    for var, description in optional_vars.items():
        value = os.getenv(var)
        if value:
            print(f"✅ {var}: {value}")
        else:
            print(f"⚠️  {var}: Using default - {description}")
    
    # Validate Google OAuth configuration
    print("\n🔐 Validating Google OAuth Configuration:")
    print("-" * 40)
    
    google_client_id = os.getenv('SOCIAL_AUTH_GOOGLE_OAUTH2_KEY')
    google_client_secret = os.getenv('SOCIAL_AUTH_GOOGLE_OAUTH2_SECRET')
    
    if google_client_id:
        if google_client_id.endswith('.apps.googleusercontent.com'):
            print(f"✅ Google Client ID format: Valid")
        else:
            warnings.append("⚠️  Google Client ID format may be incorrect (should end with .apps.googleusercontent.com)")
            print(f"⚠️  Google Client ID format: May be incorrect")
    
    if google_client_secret:
        if google_client_secret.startswith('GOCSPX-'):
            print(f"✅ Google Client Secret format: Valid")
        else:
            warnings.append("⚠️  Google Client Secret format may be incorrect (should start with GOCSPX-)")
            print(f"⚠️  Google Client Secret format: May be incorrect")
    
    # Validate database configuration
    print("\n🗄️  Validating Database Configuration:")
    print("-" * 40)
    
    use_sqlite = os.getenv('USE_SQLITE', 'False').lower() == 'true'
    
    if use_sqlite:
        print("✅ Database: Using SQLite (development mode)")
    else:
        db_host = os.getenv('DATABASE_HOST', 'localhost')
        db_port = os.getenv('DATABASE_PORT', '3306')
        db_name = os.getenv('DATABASE_NAME')
        db_user = os.getenv('DATABASE_USER')
        
        print(f"✅ Database: Using MySQL")
        print(f"   Host: {db_host}:{db_port}")
        print(f"   Database: {db_name}")
        print(f"   User: {db_user}")
        
        # Test database connection
        try:
            import MySQLdb
            print("✅ MySQL client: Available")
        except ImportError:
            try:
                import pymysql
                print("✅ PyMySQL client: Available")
            except ImportError:
                errors.append("❌ MySQL client: Neither MySQLdb nor PyMySQL available")
                print("❌ MySQL client: Not available")
    
    # Validate Django settings
    print("\n⚙️  Validating Django Configuration:")
    print("-" * 40)
    
    debug_mode = os.getenv('DEBUG', 'False').lower() == 'true'
    print(f"✅ Debug mode: {'Enabled' if debug_mode else 'Disabled'}")
    
    allowed_hosts = os.getenv('ALLOWED_HOSTS', 'localhost,127.0.0.1,testserver,.vercel.app')
    print(f"✅ Allowed hosts: {allowed_hosts}")
    
    # Check for common issues
    print("\n🔧 Checking for Common Issues:")
    print("-" * 40)
    
    # Check if frontend .env exists
    frontend_env = Path('../frontend/.env')
    if frontend_env.exists():
        print("✅ Frontend .env file: Found")
        
        # Check if frontend has matching Google Client ID
        with open(frontend_env, 'r') as f:
            frontend_content = f.read()
            if google_client_id and google_client_id in frontend_content:
                print("✅ Frontend Google Client ID: Matches backend")
            else:
                warnings.append("⚠️  Frontend Google Client ID may not match backend")
                print("⚠️  Frontend Google Client ID: May not match backend")
    else:
        warnings.append("⚠️  Frontend .env file not found")
        print("⚠️  Frontend .env file: Not found")
    
    # Summary
    print("\n" + "=" * 60)
    print("📊 VALIDATION SUMMARY")
    print("=" * 60)
    
    if not errors and not warnings:
        print("🎉 All validations passed! Environment is properly configured.")
        return True
    
    if warnings:
        print(f"⚠️  {len(warnings)} Warning(s):")
        for warning in warnings:
            print(f"   {warning}")
    
    if errors:
        print(f"❌ {len(errors)} Error(s):")
        for error in errors:
            print(f"   {error}")
        print("\n🔧 Please fix the errors above before starting the server.")
        return False
    
    print("\n✅ Environment validation completed with warnings.")
    return True

if __name__ == '__main__':
    success = validate_environment()
    sys.exit(0 if success else 1)