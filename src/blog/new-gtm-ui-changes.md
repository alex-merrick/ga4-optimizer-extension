---
faq_schema: >
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity":[{
      "@type": "Question",
      "name": "Where is the workspace switcher in the new GTM UI?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "If the workspace switcher is missing from your left-hand navigation, look at the middle right of the Overview tab under Pending Changes. Click the three vertical dots and select Manage Workspaces to switch or create new workspaces."
      }
    }, {
      "@type": "Question",
      "name": "Why does my GTM overview page show raw IDs?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Google recently updated the GTM Overview page to surface connected Google products. This often displays raw IDs (like G-XXXXXX or AW-XXXXXX) instead of clear labels, which is a structural change aimed at showing tag destinations."
      }
    }, {
      "@type": "Question",
      "name": "What events does the new GTM Visual Builder support?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Currently, the GTM visual event builder beta is strictly limited to generating tags for the Google Ads purchase event. You cannot yet use it for general GA4 events or other platforms."
      }
    }]
  }
layout: layouts/post.njk
author: Alex Merrick
date: 2026-07-07T20:10:00.000-05:00
publishDate: 2026-07-07T20:10:00.000-05:00
last_modified_at: 2026-07-07T20:10:00.000-05:00
thumbnail: /img/thumbnails/gtm-ui-update-july-2026-thumb.jpeg
post_image: /img/thumbnails/gtm-ui-update-july-2026-banner.jpeg
url: "https://www.gaoptimizer.com/blog/new-gtm-ui-changes/"
title: "New GTM UI Changes: Where to Find the Workspace Switcher"
description: "Master the new GTM UI changes in {{ currentYear }}. Learn exactly where to find the missing workspace switcher and navigate the cluttered overview dashboard."
tags:
  - post
  - gtm
  - google-tag
---

On July 1, {{ currentYear }}, Google rolled out an update to the Google Tag Manager Overview page. The official release notes describe the update as a streamlined interface designed to help new and experienced users navigate their tagging setups more efficiently. 

However, many tracking specialists logging into their accounts this week have found the update confusing rather than helpful. The most jarring change is the disappearance of the workspace switcher from the top-left menu. Additionally, Google is now surfacing raw destination IDs directly on the front page, leading to a cluttered user experience.

If you are struggling to navigate the new GTM UI, here is exactly what changed and where to find your missing tools.

## Where to Find the Missing GTM Workspace Switcher

For a large portion of users, the workspace drop-down menu that historically sat at the top left of the GTM interface is completely gone. Google appears to be running an A/B test, as some users still see the legacy placement while others are left wondering how to change workspaces.

If you no longer see the workspace switcher in its usual spot, Google has relocated it to the center of the screen.

### Step-by-Step Instructions

1. Navigate to the **Overview** tab in your GTM container.
2. Look for the **Pending Changes** section in the center of the page.
3. On the far right side of this section, click the **three vertical dots**.
4. Select **Manage Workspaces** from the dropdown menu to view, switch, or create new workspaces.

This extra friction slows down users who frequently toggle between environments during testing. If you rely on moving quickly between workspaces, you will need to retrain your muscle memory to target this new nested menu.

<img src="/img/gtm-update.jpeg" alt="Google Tag manager overview view UI update" width="1382" height="950">

## Cluttered Google Product Connections

Another significant shift in the new interface is how Google handles product connections. The new Overview page aggressively surfaces connected Google tags and destinations right on the front page.

While the intention might be to show users a unified view of their Google ecosystem, the execution falls short. The interface displays raw product IDs (like `G-XXXXXX` and `AW-XXXXXX`) rather than user-friendly descriptive labels. 

For beginners, seeing a list of raw tracking IDs on the dashboard is highly confusing. It forces users to cross-reference IDs with their GA4 or Google Ads accounts just to understand which destinations are active. This change heavily favors Google products while pushing custom implementations and non-Google tags further into the background.

## The Visual Builder Beta Limitations

Alongside the UI layout changes, Google introduced a new visual event builder on the Overview page. Labeled as a beta feature, this tool promises to help users set up tags automatically by completing test actions directly on their website.

While codeless tagging sounds great in theory, the current implementation is heavily restricted. The visual builder is exclusively available for the **Google Ads purchase event**. 

You cannot use it to track standard Google Analytics 4 interactions like button clicks, form submissions, or custom lead events. This limitation makes the feature irrelevant for the vast majority of day-to-day GTM configurations. For now, continuing to use standard triggers and the dataLayer remains the most reliable way to build your tracking setup.

### Video Walkthrough of the New Interface

For a deeper dive into the new interface changes, Julius Fedorovicius from Analytics Mania recently published an excellent video walkthrough. While he does not appear to have run into the missing workspace switcher A/B test in his container, the video provides a comprehensive look at how the visual builder and the rest of the new layout function:

<div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; margin-bottom: 30px;">
  <iframe src="https://www.youtube.com/embed/exHhk8VihNg" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border:0;" allowfullscreen title="Google Tag Manager UI Updates Video Walkthrough"></iframe>
</div>

## Navigating GTM and GA4 More Efficiently

Interface updates that hide necessary features can disrupt your entire reporting workflow. Just like the missing workspace switcher in GTM, Google Analytics 4 frequently buries valuable data behind multiple clicks and complex configuration screens.

If you are spending too much time digging through GA4 menus to validate the tags you just built in GTM, install the **[GA4 Optimizer Chrome extension](https://chromewebstore.google.com/detail/ga4-optimizer/hlldjkhoepkephgaeifgbelgchncfnjj?utm_source=gaoptimizer.com&utm_medium=website&utm_campaign=blog_new_gtm_ui_changes)**. 

The extension enhances the native GA4 reporting interface by adding tools that save you time. You can copy custom dimensions across properties instantly, view expanded table rows to prevent pagination, and access quick date range shortcuts. It restores efficiency to an interface that can otherwise feel tedious to navigate.

## Frequently Asked Questions

### Where is the workspace switcher in the new GTM UI?

If the workspace switcher is missing from your left-hand navigation, look at the middle right of the Overview tab under Pending Changes. Click the three vertical dots and select Manage Workspaces to switch or create new workspaces.

### Why does my GTM overview page show raw IDs?

Google recently updated the GTM Overview page to surface connected Google products. This often displays raw IDs (like G-XXXXXX or AW-XXXXXX) instead of clear labels, which is a structural change aimed at showing tag destinations.

### What events does the new GTM Visual Builder support?

Currently, the GTM visual event builder beta is strictly limited to generating tags for the Google Ads purchase event. You cannot yet use it for general GA4 events or other platforms.