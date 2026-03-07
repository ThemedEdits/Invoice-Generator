## Packages
firebase | Firebase Client SDK for Auth and Firestore
konva | Core canvas drawing library
react-konva | React bindings for Konva canvas editor
pdf-lib | Library to create and modify PDFs (used for final invoice generation)
pdfjs-dist | Library to render PDF pages to canvas for the editor background
uuid | Generating unique IDs for fields
lucide-react | Icons
date-fns | Date formatting

## Notes
- Fully serverless architecture using Firebase (Auth, Firestore).
- Cloudinary used for direct file uploads from the client (templates and generated invoices).
- Standard backend `/api` routes are not used for data; React Query wraps Firebase SDK directly.
- Template editor uses fixed A4 coordinates (595x842) mapped to pdf-lib space.
