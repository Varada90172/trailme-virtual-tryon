# Hosting App Inside Databricks Guide (Databricks Apps)

This guide describes how to deploy the Virtual Try-On application (React + FastAPI) as a native **Databricks App**. 

**Databricks Apps** is a serverless, secure hosting platform that allows you to deploy full-stack custom web applications directly within your Databricks workspace. It automatically handles Single Sign-On (SSO) authentication, data access controls, and compute provisioning.

---

## 1. How Databricks Apps Works

Since Databricks Apps allocates a single web port and URL path for your application, you must package the React frontend and FastAPI backend into a single running process.

```mermaid
graph LR
    User[Workspace User] -->|SSO URL| DatabricksProxy[Databricks App Proxy]
    DatabricksProxy -->|Forwards requests on $DATABRICKS_APP_PORT| FastAPI[FastAPI Web Server]
    subgraph Running in Databricks App Compute
        FastAPI -->|Serves /api/*| BackendLogic[FastAPI Routes]
        FastAPI -->|Serves static files under /*| ReactFrontend[Built React Assets]
        BackendLogic -->|Direct SQL Queries (no token needed)| UC[(Unity Catalog / Tables)]
    end
```

### Key Advantages of Databricks Apps
* **Built-in Authentication:** No need to configure Auth0, Cognito, or MSAL. Users are authenticated via their Databricks workspace SSO.
* **Automatic Security Context:** The running application automatically gains access to SQL Warehouses and Unity Catalog tables as the running service principal or user, avoiding credential leaks.
* **Network Security:** The application runs entirely within your workspace boundary, keeping it private from the public web.

---

## 2. Code Adjustments for Single-Process Hosting

You need to compile the React frontend into static HTML/JS/CSS files, and configure FastAPI to serve these assets.

### A. Modify the React Build Output
Ensure that React builds its assets into a folder accessible by the backend, for example, `backend/dist`. 

In your `frontend_part/vite.config.ts` (or similar build config):
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    // Write build output directly into the backend directory
    outDir: '../backend/dist',
    emptyOutDir: true,
  },
});
```

### B. Configure FastAPI to Serve Static Assets
Mount the static `dist/` directory inside your FastAPI `main.py` file to host the UI.

```python
# backend/main.py
import os
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

app = FastAPI()

# 1. Register API Routes first
@app.get("/api/status")
def get_status():
    return {"status": "running", "environment": "databricks_apps"}

# 2. Mount static folder for Frontend serving (catch-all)
dist_dir = os.path.join(os.path.dirname(__file__), "dist")

if os.path.exists(dist_dir):
    # Mount build assets (JS, CSS, images)
    app.mount("/", StaticFiles(directory=dist_dir, html=True), name="frontend")
    
    # Enable HTML5 History API fallback for single page applications (SPA)
    @app.exception_handler(404)
    async def not_found_handler(request, exc):
        return FileResponse(os.path.join(dist_dir, "index.html"))
else:
    print(f"Warning: Static build directory not found at {dist_dir}. Running in backend-only mode.")
```

---

## 3. Creating App Configuration Files

Databricks Apps uses two configuration files placed at your project's root: `app.yaml` (runtime settings) and `databricks.yml` (asset bundle configuration).

### A. Runtime Configuration (`app.yaml`)
Create this file in the root of the workspace to tell Databricks how to launch your FastAPI web server.

```yaml
# app.yaml (Project Root)
command:
  - uvicorn
  - backend.main:app
  - --host
  - 0.0.0.0
  - --port
  - "$DATABRICKS_APP_PORT"   # Dynamically replaced by Databricks runtime
```

### B. Databricks Asset Bundle Config (`databricks.yml`)
Create this file in the root of the workspace to define the deployment asset.

```yaml
# databricks.yml (Project Root)
bundle:
  name: virtual-tryon-app

resources:
  apps:
    virtual_tryon_app:
      name: virtual-tryon-app
      app_type: CUSTOM
      source_code_path: ./
      # Environment variables can be configured here
      env:
        - name: GEMINI_API_KEY
          value: "AQ.Ab8RN6KbF..." # Or load from Databricks Secrets
```

---

## 4. Deployment Steps

Deploying your app requires the **Databricks CLI** (v0.250.0 or higher).

### Step 1: Install and Authenticate Databricks CLI
Open a terminal in your workspace root and log in:
```bash
databricks configure
```
Enter your Databricks Workspace URL when prompted and complete the browser SSO flow.

### Step 2: Build the React Application
Build your React production assets so they are written to `backend/dist`:
```bash
cd frontend_part
npm install
npm run build
cd ..
```

### Step 3: Package Python Dependencies
Make sure all backend packages are declared in `backend/requirements.txt`. Add standard server requirements if they are missing (e.g., `uvicorn`, `fastapi`, `databricks-sql-connector`).

### Step 4: Deploy the App
Deploy the entire project as a Databricks Asset Bundle:
```bash
databricks bundle deploy
```

Once the deploy command completes:
1. Open the Databricks Workspace in your web browser.
2. In the sidebar navigation, click on **Apps**.
3. Locate **virtual-tryon-app** in the list.
4. Click on the App link to open your full-stack React-FastAPI application inside Databricks.
