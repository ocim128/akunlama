---
description: Deploy the UI to Cloudflare Pages
---

This workflow guides you through building and deploying the Vue.js frontend to Cloudflare Pages using Wrangler.

### Prerequisites
- Ensure you have a Cloudflare account.
- Authenticate Wrangler if you haven't:
  ```powershell
  npx wrangler login
  ```

### Step 1: Build the UI
Navigate to the `ui` directory and run the build command. This creates the `dist` folder.
// turbo
```powershell
cd ui
npx vite build
```

### Step 2: Deploy to Cloudflare Pages
Deploy the `dist` directory to your project. Replace `akunlama-ui` with your actual project name if different.

// turbo
```powershell
npx wrangler pages deploy dist --project-name akunlama-ui --branch main
```

### Troubleshooting
- **Project not found**: If this is your first time, Wrangler will ask to create the project. Follow the interactive prompts.
- **Authentication**: If you get a 403 or unauthorized error, run `npx wrangler login` again.
- **API URL**: Ensure `ui/config/apiconfig.js` points to your correct production API URL.
