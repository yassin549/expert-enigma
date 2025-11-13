#!/usr/bin/env python3
"""
Fix Pydantic max_digits constraints for Railway deployment
Removes max_digits from all Field definitions to fix compatibility issues
"""

import os
import re
from pathlib import Path

CONSTRAINTS = ["max_digits", "decimal_places"]


def fix_constraints_in_file(file_path):
    """Remove unsupported Pydantic constraints from a single file"""
    print(f"Processing: {file_path}")

    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    new_content = content

    for constraint in CONSTRAINTS:
        # Pattern to match Field definitions with the constraint (multi-line aware)
        pattern = rf'(\w+:\s*[^=]+\s*=\s*Field\(\s*(?:[^)]*?)?){constraint}=\d+,?\s*([^)]*?\))'

        def replace_constraint(match):
            before = match.group(1)
            after = match.group(2)

            # Clean up any double commas or trailing commas before closing paren
            cleaned_after = re.sub(r',\s*,', ',', after)
            cleaned_after = re.sub(r',\s*\)', ')', cleaned_after)

            return before + cleaned_after

        new_content = re.sub(pattern, replace_constraint, new_content, flags=re.MULTILINE | re.DOTALL)

        # Remove standalone lines that only contain the constraint
        line_pattern = rf'\s*{constraint}=\d+,?\s*\n'
        new_content = re.sub(line_pattern, '\n', new_content)

    if new_content != content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"  ✅ Fixed constraints: {', '.join(CONSTRAINTS)}")
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
        if fix_constraints_in_file(py_file):
            fixed_files += 1
    
    print("=" * 60)
    print(f"✅ Processed {total_files} files")
    print(f"🔧 Fixed {fixed_files} files")
    print("🚀 Models are now Railway-compatible!")

if __name__ == "__main__":
    main()
