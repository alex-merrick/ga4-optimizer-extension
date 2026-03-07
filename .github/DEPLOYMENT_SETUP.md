# GitHub Pages Deployment Setup

## What Was Fixed

Your site was failing to deploy because GitHub Pages was trying to use Jekyll (the default static site generator) instead of Eleventy (11ty), which your site actually uses.

## Changes Made

1. **Created `.nojekyll` file** - Tells GitHub Pages to skip Jekyll processing
2. **Created GitHub Actions workflow** (`.github/workflows/deploy.yml`) - Builds your Eleventy site properly
3. **Updated Eleventy config** - Ensures `.nojekyll` is copied to the build output

## GitHub Pages Configuration Required

To enable the new workflow, you need to configure GitHub Pages settings:

1. Go to your repository on GitHub
2. Click **Settings** → **Pages** (in the left sidebar)
3. Under **Build and deployment**:
   - **Source**: Select "GitHub Actions" (not "Deploy from a branch")
4. Save the changes

## How It Works

The workflow will now:
- Trigger on every push to the `main` branch
- Install Node.js and dependencies
- Build your Eleventy site (`npm run build`)
- Deploy the `_site` folder to GitHub Pages

## Testing

After configuring the settings above:
1. Commit and push these changes
2. Go to **Actions** tab in your repository
3. Watch the "Deploy Eleventy site to Pages" workflow run
4. Your site should deploy successfully!

## Troubleshooting

If the deployment still fails:
- Check that your default branch is named `main` (update the workflow if it's `master`)
- Ensure GitHub Pages is enabled in repository settings
- Check the Actions tab for detailed error logs
