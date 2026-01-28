
import os
import glob
from pypdf import PdfReader

def main():
    # Find the PDF file
    files = glob.glob(os.path.join(os.getcwd(), "BKGR Lettre Quotidienne*.pdf"))
    if not files:
        print("No matching PDF file found.")
        return

    pdf_path = files[0]
    print(f"Reading PDF: {pdf_path}")
    
    try:
        reader = PdfReader(pdf_path)
        print(f"Number of Pages: {len(reader.pages)}")
        
        text = ""
        for i, page in enumerate(reader.pages):
            page_text = page.extract_text()
            if page_text:
                text += f"\n--- Page {i+1} ---\n"
                text += page_text
        
        output_path = os.path.join(os.getcwd(), "latest_pdf_content.txt")
        print(f"Writing to: {output_path}")
        
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(text)
            
        print(f"Success! Extracted {len(text)} characters.")
        print("--- First 500 characters ---")
        print(text[:500])
        print("----------------------------")
        
    except Exception as e:
        print(f"Error parsing PDF: {e}")

if __name__ == "__main__":
    main()
