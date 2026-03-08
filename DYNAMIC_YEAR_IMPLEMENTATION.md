# Dynamic Year Implementation

## Overview
Implemented automatic year updates across the site to ensure content always appears current without manual updates.

## Changes Made

### 1. Added Custom Year Filter
**File**: `.eleventy.js`
- Added `currentYear` filter that returns `new Date().getFullYear()`
- Can be used anywhere in Nunjucks templates: `{{ "" | currentYear }}`

### 2. Updated Footer Copyright
**Files**: 
- `src/_includes/layouts/base.njk`
- `src/_includes/layouts/survey-layout.njk`

**Change**: `© 2025` → `© {{ "" | currentYear }}`

**Result**: Footer now shows "© 2026" and will automatically update each year

### 3. Updated Blog Post with Dynamic Year
**File**: `src/blog/best-google-analytics-browser-extensions-ga4.md`

**Changes**:
- Title: "...GA4 (2026 Guide)" → "...GA4 ({{ currentYear }} Guide)"
- Description: "...in 2026..." → "...in {{ currentYear }}..."
- Body content: "...compatible with GA4 in 2026" → "...compatible with GA4 in {{ "" | currentYear }}"
- FAQ answer: Updated to remove hardcoded year

**Implementation Method**: Used `eleventyComputed` in frontmatter to compute title and description dynamically

## How to Use in Future Blog Posts

### In Frontmatter (YAML)
```yaml
eleventyComputed:
  currentYear: "{{ '' | currentYear }}"
  title: "My Post Title ({{ currentYear }} Edition)"
  description: "Updated for {{ currentYear }}"
```

### In Content (Markdown/HTML)
```markdown
This guide is updated for {{ "" | currentYear }}.
```

### In Nunjucks Templates
```njk
<p>Copyright {{ "" | currentYear }}</p>
```

## Important Notes

1. **JSON Schema**: Cannot use Nunjucks variables inside JSON in frontmatter (it breaks parsing)
2. **eleventyComputed**: Use this for dynamic frontmatter values like title and description
3. **Build Time**: Year is computed at build time, not runtime (site needs to be rebuilt to update)
4. **Automatic Updates**: When deployed via GitHub Actions, the year will always be current

## Verification

✅ Footer shows current year (2026)
✅ Blog post title includes current year
✅ Blog post meta description includes current year
✅ Blog post body content includes current year
✅ All builds successful

## Future Recommendations

Consider adding dynamic year to:
- Any "Best of [YEAR]" style posts
- Annual guides or roundups
- Time-sensitive content that should appear current
- Copyright notices (already done)
