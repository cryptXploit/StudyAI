# E:\Production-ready-StudyAI\backend\src\utils\extractor.py
import sys
import os
from markitdown import MarkItDown

def main():
    if len(sys.argv) < 2:
        print("Error: Missing file path", file=sys.stderr)
        sys.exit(1)
        
    file_path = sys.argv[1]
    
    if not os.path.exists(file_path):
        print(f"Error: File not found at {file_path}", file=sys.stderr)
        sys.exit(1)
        
    try:
        markitdown = MarkItDown()
        result = markitdown.convert(file_path)
        print(result.text_content)
        sys.exit(0)
    except Exception as e:
        print(f"Error during extraction: {str(e)}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()