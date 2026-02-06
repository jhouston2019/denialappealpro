"""
Setup script to create required directories for Denial Appeal Pro
Run this before starting the application for the first time
"""
import os
from pathlib import Path

def setup_directories():
    """Create all required directories for the application"""
    
    print("\n" + "="*60)
    print("📁 SETTING UP DIRECTORIES")
    print("="*60 + "\n")
    
    # Get the backend directory (where this script is located)
    backend_dir = Path(__file__).parent
    
    # Directories to create
    directories = [
        backend_dir / 'uploads',
        backend_dir / 'generated',
        backend_dir / 'logs',
    ]
    
    created = []
    already_exists = []
    
    for directory in directories:
        try:
            if directory.exists():
                already_exists.append(directory.name)
                print(f"✅ {directory.name}/ - Already exists")
            else:
                directory.mkdir(parents=True, exist_ok=True)
                created.append(directory.name)
                print(f"✅ {directory.name}/ - Created")
        except Exception as e:
            print(f"❌ {directory.name}/ - Failed to create: {e}")
    
    print("\n" + "="*60)
    print("📊 SUMMARY")
    print("="*60)
    print(f"Created: {len(created)} directories")
    print(f"Already existed: {len(already_exists)} directories")
    
    if created:
        print(f"\nNew directories: {', '.join(created)}")
    
    print("\n✅ Directory setup complete!")
    print("="*60 + "\n")
    
    return True

if __name__ == '__main__':
    setup_directories()
