# Quick Start: Netlify Deployment

## Deploy to Netlify

1. **Push to Repository:**
   ```bash
   git add .
   git commit -m "Prepare for Netlify deployment"
   git push
   ```

2. **Connect on Netlify:**
   - Login to [Netlify](https://netlify.com)
   - Click "Import from Git"
   - Select your repository

3. **Configure:**
   - Base directory: `frontend`
   - Build command: (leave empty - uses netlify.toml)
   - Publish directory: `build`

4. **Add Environment Variable:**
   - Go to: Site settings → Environment variables
   - Add: `REACT_APP_API_URL` = `https://your-backend-url.com`

5. **Deploy:**
   - Click "Deploy site"
   - Your site will be live at `https://your-site.netlify.app`

## Run Locally

```bash
cd frontend
npm install
npm start
# Opens on http://localhost:3000
```

## Key Files

- `frontend/netlify.toml` - Netlify configuration
- `NETLIFY_DEPLOYMENT.md` - Full deployment guide
- `frontend/package.json` - Build scripts

## Quick Troubleshooting

**Build fails?** Check build logs in Netlify dashboard.

**Can't connect to backend?** Set `REACT_APP_API_URL` in Netlify environment variables.

**Routes not working?** Check `netlify.toml` has redirect rules.










