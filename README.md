# Virtual Try-On App

This workspace contains a simple virtual try-on prototype with:

- a React frontend for uploading a person and outfit image
- a FastAPI backend that stores the uploads and generates a placeholder result

## Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

## Frontend

```bash
cd frontend
npm install
npm start
```

## Notes

- The frontend expects the API at http://localhost:8000/api.
- The backend currently falls back to a generated placeholder image when no Gemini API key is present.
