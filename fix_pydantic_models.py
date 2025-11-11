#!/usr/bin/env python3
"""
Fix Pydantic max_digits constraints for Railway deployment
Removes max_digits from all Field definitions to fix compatibility issues
"""

import os
import re
from pathlib import Path

def fix_max_digits_in_file(file_path):
    """Remove max_digits constraints from a single file"""
    print(f"Processing: {file_path}")
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Pattern to match Field definitions with max_digits
    # This will match multi-line Field definitions
    pattern = r'(\w+:\s*[^=]+\s*=\s*Field\(\s*(?:[^)]*?)?)max_digits=\d+,?\s*([^)]*?\))'
    
    # Replace max_digits with nothing, handling comma cleanup
    def replace_max_digits(match):
        before = match.group(1)
        after = match.group(2)
        
        # Clean up any double commas or trailing commas before closing paren
        after = re.sub(r',\s*,', ',', after)  # Remove double commas
        after = re.sub(r',\s*\)', ')', after)  # Remove trailing comma before )
        
        return before + after
    
    # Apply the replacement
    new_content = re.sub(pattern, replace_max_digits, content, flags=re.MULTILINE | re.DOTALL)
    
    # Additional cleanup for standalone max_digits lines
    new_content = re.sub(r'\s*max_digits=\d+,?\s*\n', '\n', new_content)
    
    # Write back if changed
    if new_content != content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"  ✅ Fixed max_digits constraints")
        return True
    else:
        print(f"  ⏭️ No changes needed")
        return False

def main():
    """Fix all Python model files"""
    models_dir = Path("apps/api/models")
    
    if not models_dir.exists():
        print(f"❌ Models directory not found: {models_dir}")
        return
    
    print("🔧 Fixing Pydantic max_digits constraints for Railway deployment")
    print("=" * 60)
    
    fixed_files = 0
    total_files = 0
    
    # Process all Python files in models directory
    for py_file in models_dir.glob("*.py"):
        if py_file.name == "__init__.py":
            continue
            
        total_files += 1
        if fix_max_digits_in_file(py_file):
            fixed_files += 1
    
    print("=" * 60)
    print(f"✅ Processed {total_files} files")
    print(f"🔧 Fixed {fixed_files} files")
    print("🚀 Models are now Railway-compatible!")

if __name__ == "__main__":
    main()
