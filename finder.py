import os
import re
import sys

def process_css_files(path, fix_mode=False):
    """Scans and optionally fixes CSS files for common syntax errors."""
    
    # Define patterns for errors and their corrections.
    # The key is the error pattern (regex), the value is the correction.
    fix_patterns = {
        # Finds a stray `*/` at the end of a line, especially @import.
        re.compile(r"(@import .*?;)\s*\*/$"): r"\1",
        # Finds a broken `http:/*` and corrects it to `http://`.
        re.compile(r"http:/\*"): "http://",
        # Finds a double-closed comment `*/ */` and removes the second one.
        re.compile(r"(\*/\s*)\*/"): r"\1",
    }

    files_processed = 0
    errors_found = 0

    for root, dirs, files in os.walk(path):
        # Exclude node_modules to speed up the search and avoid dependency noise
        if 'node_modules' in dirs:
            dirs.remove('node_modules')

        for file in files:
            if file.endswith('.css'):
                file_path = os.path.join(root, file)
                try:
                    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                        content = f.read()
                    
                    original_content = content
                    modified_content = content

                    # Apply all defined fixes
                    for pattern, replacement in fix_patterns.items():
                        modified_content = pattern.sub(replacement, modified_content)

                    if modified_content != original_content:
                        errors_found += 1
                        if fix_mode:
                            print(f"✅ Fixed error in: {file_path}")
                            with open(file_path, 'w', encoding='utf-8') as f:
                                f.write(modified_content)
                        else:
                            print(f"❌ Found potential error in: {file_path}")

                    files_processed += 1

                except Exception as e:
                    print(f"Could not read file {file_path}: {e}")
    
    if fix_mode:
        print(f"\nScan complete. Fixed {errors_found} file(s).")
    elif errors_found > 0:
        print(f"\nScan complete. Found {errors_found} file(s) with potential errors.")
        print("Run 'python finder.py --fix' to attempt automatic correction.")
    else:
        print("\nScan complete. No common CSS errors found.")

if __name__ == "__main__":
    # Determine if we are in "fix" mode
    fix_mode_enabled = "--fix" in sys.argv

    # Start searching from the frontend's source directory
    search_directory = os.path.join(os.getcwd(), 'src', 'frontend', 'src')
    action = "Fixing" if fix_mode_enabled else "Scanning for"
    print(f"🔍 {action} CSS errors in: {search_directory}")

    process_css_files(search_directory, fix_mode=fix_mode_enabled)