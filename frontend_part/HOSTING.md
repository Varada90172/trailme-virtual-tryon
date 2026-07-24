Local preview (production build)

1. Install dependencies (pnpm recommended):

```bash
pnpm install
pnpm run build
pnpm run preview
```

The app will be served at http://localhost:4173 by default.

Deploy to Vercel (recommended for Vite apps)

1. Install Vercel CLI (optional):

```bash
npm i -g vercel
```

2. From the project root run:

```bash
vercel login
vercel --prod
```

Vercel will detect the Vite app and deploy the `build` output automatically.

Deploy to GitHub Pages (alternative)

1. Install `gh-pages` and add deploy scripts:

```bash
pnpm add -D gh-pages
```

2. Add scripts to `package.json`:

```json
"scripts": {
  "predeploy": "pnpm run build",
  "deploy": "gh-pages -d dist"
}
```

3. Run:

```bash
pnpm run deploy
```

This publishes the `dist` folder to GitHub Pages. Configure the repository settings to serve from the `gh-pages` branch if needed.

Notes

- If you want me to actually deploy this to Vercel/GitHub for you, I can prepare a `vercel.json` or run additional setup steps — but I cannot perform the remote deployment without access to your account.
- The login UI is now user-focused and routes to the in-app catalog for trying sarees.

Multiple hosting options (switch quickly)

- Vercel: `vercel` will detect the static build. I added `vercel.json` for SPA routing.
- Netlify: use the `netlify.toml` included; CLI deploy with `netlify deploy --prod --dir=dist` after build.
- GitHub Pages: run `npm run deploy` to publish `dist` to `gh-pages` branch (workflow also added).
- Docker: build and run the container locally:

```bash
docker build -t trailme .
docker run -p 8080:80 trailme
```

If a provider fails for any reason, try the next one above — the build artefact is the same (`dist`).

If you'd like, I can:

- Prepare a `vercel` deployment command and example `vercel` environment file.
- Guide you to run `npm run deploy` (GitHub Pages) and enable the GitHub Action.
- Help you test the Docker image locally and map ports.

Tell me which provider you want to try first and whether you want me to prepare any auth/secret guidance for that provider.