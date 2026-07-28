# SparkVy — Project Structure

```
spark/
├── frontend/          → deploy to Vercel
│   ├── index.html
│   ├── products.html
│   ├── registration.html
│   ├── services.html
│   ├── admin.html
│   ├── vercel.json
│   ├── assets/
│   │   ├── chem-fx.css
│   │   └── chem-fx.js
│   └── images/         (all logos, product photos, team photos)
│
└── backend/            → deploy to Render
    ├── main.py
    ├── test.py
    ├── requirements.txt
    ├── .env.example
    └── .gitignore
```

## What moved, and why

| File | From | To | Why |
|---|---|---|---|
| `index.html`, `products.html`, `registration.html`, `services.html`, `admin.html` | project root | `frontend/` | Static pages — served by Vercel |
| `assets/` (chem-fx.css, chem-fx.js) | project root | `frontend/assets/` | Moved as a whole folder together with the HTML, so every `href="assets/chem-fx.css"` / `src="assets/chem-fx.js"` reference still resolves — no path edits needed |
| `images/` (all logos/photos) | project root | `frontend/images/` | Same reasoning — moved as a whole folder, so every `src="images/..."` reference still resolves unchanged |
| `main.py` | project root | `backend/main.py` | FastAPI app — served by Render |
| `test.py` | project root | `backend/test.py` | Standalone Mongo test script (not wired into the app, but Python + backend-related, so it lives with the backend code) |
| `requirements.txt` | project root | `backend/requirements.txt` | Only backend code has Python dependencies |

**No `database.py`, `models.py`, or `routers/` existed in this project** — everything backend-related was in the single `main.py`, so there was nothing else to move on the Python side.

## Paths / imports that were updated

1. **HTML → CSS/JS/image paths: no changes needed.** Since `assets/` and `images/` moved *together* with the HTML files (same relative positions preserved inside `frontend/`), every existing `href="assets/chem-fx.css"`, `src="assets/chem-fx.js"`, and `src="images/..."` reference still works exactly as before.

2. **`backend/main.py` — Mongo connection string is now configurable.**
   Before: `MongoClient("mongodb://localhost:27017/")` (hardcoded)
   After:
   ```python
   MONGODB_URI = os.environ.get("MONGODB_URI", "mongodb://localhost:27017/")
   client = MongoClient(MONGODB_URI)
   ```
   Locally this behaves *identically* to before (same default). On Render, you set `MONGODB_URI` to your MongoDB Atlas connection string, and the exact same code connects to Atlas instead — required because Render can't reach a `localhost` database.

3. **`frontend/index.html`, `admin.html`, `registration.html` — `API_BASE` is now deployment-aware.**
   Before: `const API_BASE = 'http://127.0.0.1:8000';` (hardcoded, same for local and prod)
   After:
   ```javascript
   const API_BASE = (['localhost','127.0.0.1'].includes(window.location.hostname))
     ? 'http://127.0.0.1:8000'
     : 'https://sparkvy-backend.onrender.com';
   ```
   This was required because frontend and backend are now on two different domains (Vercel + Render) instead of both being `localhost`. Locally the site behaves exactly as before. **Before deploying, replace `https://sparkvy-backend.onrender.com` in all three files with your actual Render backend URL** (you'll get this after creating the Render service).

No other functionality, styling, or page behavior was changed.

## Deploying

### 1. Database → MongoDB Atlas
- Create a free cluster at [mongodb.com/atlas](https://www.mongodb.com/atlas)
- Create a database user and allow network access from anywhere (`0.0.0.0/0`), or Render's IPs
- Copy the connection string (`mongodb+srv://...`)

### 2. Backend → Render
- New **Web Service** → connect this repo → set **Root Directory** to `backend`
- **Build Command:** `pip install -r requirements.txt`
- **Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
- **Environment → Add Variable:** `MONGODB_URI` = your Atlas connection string
- Deploy, then copy the resulting `https://<your-service>.onrender.com` URL

### 3. Frontend → Vercel
- In `frontend/index.html`, `frontend/admin.html`, and `frontend/registration.html`, replace `https://sparkvy-backend.onrender.com` with your real Render URL from step 2
- New **Project** on Vercel → connect this repo → set **Root Directory** to `frontend`
- Framework preset: **Other** (static site) — no build command needed
- Deploy

That's it — the site keeps working locally exactly as before (backend on `127.0.0.1:8000`, MongoDB on `localhost:27017`), and works in production once the Render URL is filled in.
