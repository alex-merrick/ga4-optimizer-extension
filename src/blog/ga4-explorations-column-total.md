---
faq_schema: >
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity":[{
      "@type": "Question",
      "name": "How do I see the percentage of column total in GA4 Explorations?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "By default, Google Analytics 4 does not show column percentages in Freeform Explorations. You must export the data to a spreadsheet to calculate it manually, or use the GA4 Optimizer browser extension to see the percentages automatically directly in your report table."
      }
    }, {
      "@type": "Question",
      "name": "Does GA4 have a percent of total metric?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "GA4 standard reports show a basic percentage of total under the main metrics. However, this feature is missing in Explorations, meaning you cannot natively see the percentage contribution of a specific row without exporting the data."
      }
    }, {
      "@type": "Question",
      "name": "Why are my percentages not showing up in GA4 Explorations with the extension installed?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "The percentage of column total feature only works in Freeform Explorations that use the Table visualization. It will not activate in Funnel, Path, or Cohort explorations. Additionally, the Total row must be visible on your screen so the extension can perform the calculation."
      }
    }]
  }
layout: layouts/post.njk
author: Alex Merrick
title: "How to See Percentage of Column Total in GA4 Freeform Explorations"
date: 2026-04-14T08:00:00.000-05:00
publishDate: 2026-04-14T08:00:00.000-05:00
last_modified_at: 2026-04-14T08:00:00.000-05:00
thumbnail: /img/thumbnails/thumb-percentage.png
post_image: /img/thumbnails/banner-percentage.png
description: "GA4 Freeform Explorations don't show percentage of column total by default. Learn the manual workaround and how to get instant in-table percentages without exporting your data."
url: "https://www.gaoptimizer.com/blog/ga4-explorations-column-total/"
tags:
  - post
  - ga4
  - explorations
---

You are analyzing a custom report in Google Analytics 4. You have your dimensions set, your metrics applied, and you are staring at a table full of raw numbers.

But raw numbers rarely tell the whole story. If a specific landing page brought in 4,500 sessions, is that good? To know for sure, you need to know what percentage of your total traffic that page represents: the percentage of column total.

In Universal Analytics, this was a standard feature. In GA4 Standard Reports, you get a small summary percentage at the top of your columns. But when you move into GA4 Freeform Explorations to do real analysis, the percentage of column total is completely missing.

Here is how analysts are currently dealing with this missing feature, and how you can fix it instantly without leaving your browser.

## The Manual Workaround: Exporting Data

Because Google did not include a percent of total calculation in the GA4 Exploration interface, the official solution is a manual workaround.

To find your percentages, you have to:
1. Build your Freeform Exploration.
2. Click the export icon in the top right corner.
3. Download the data as a CSV or Google Sheet.
4. Open the file and manually write a formula dividing each row by the column total.

This workflow breaks your concentration. If you notice a trend and need to add a new dimension like "Device Category" to your report, you have to start the entire export and calculation process over from scratch. 

## The Automated Solution: Add Percentage of Column Total with GA4 Optimizer

You should not have to leave Google Analytics just to do basic division. We built a solution directly into the free [GA4 Optimizer](https://chromewebstore.google.com/detail/ga4-optimizer/hlldjkhoepkephgaeifgbelgchncfnjj?utm_source=gaoptimizer.com&utm_medium=website&utm_campaign=blog_column_total) browser extension that brings this missing context back to your reports.

When you have the extension installed, you do not need to click any buttons or configure any settings. The calculation happens automatically.

Here is how it works:

1. Open a Freeform Exploration and ensure you are using the Table visualization.
2. Look at your metric columns. The extension automatically calculates the percentage contribution of each row relative to the total at the bottom of that column.
3. The percentage value is injected directly into the table cell next to the raw number in parentheses (for example, "4,500 (15.2%)").
4. If the raw number is too large and the percentage does not fit neatly inside the cell, the extension hides the inline text to keep your table clean. In this case, simply hover your mouse over the cell, and a tooltip will display the exact percentage.

<img src="/img/column-total-expoloration.png" alt="GA4 Freeform Exploration table showing percentage of column total injected by GA4 Optimizer next to each metric value" style="max-width: 100%; height: auto; border: 1px solid #ddd; border-radius: 4px; margin: 20px 0;" loading="lazy" />

### A Note on Visibility
For the extension to run this calculation, the "Total" row needs to be visible on your screen. If you scroll far down a long table and the total row disappears from view, the percentages might rely on the last known total or prompt you to scroll up so the tool can capture the numbers again.

## Stop Exporting Just to See Percentages

Context is everything in data analysis. The percentage of column total is one of the most basic pieces of context you can have in a GA4 Freeform Exploration, and Google simply left it out. By adding it back directly into your table, you can spot top performers, identify traffic distribution, and make decisions without ever opening a spreadsheet.

You can get this feature, along with 15 other workflow improvements, by installing the [GA4 Optimizer extension](https://chromewebstore.google.com/detail/ga4-optimizer/hlldjkhoepkephgaeifgbelgchncfnjj?utm_source=gaoptimizer.com&utm_medium=website&utm_campaign=blog_column_total) from the Chrome Web Store. It's completely free.

***

## Frequently Asked Questions

### How do I see the percentage of column total in GA4 Explorations?

By default, Google Analytics 4 does not show column percentages in Freeform Explorations. You must export the data to a spreadsheet to calculate it manually, or use the [GA4 Optimizer](https://chromewebstore.google.com/detail/ga4-optimizer/hlldjkhoepkephgaeifgbelgchncfnjj?utm_source=gaoptimizer.com&utm_medium=website&utm_campaign=blog_column_total) browser extension to see the percentages automatically directly in your report table.

### Does GA4 have a percent of total metric?

GA4 standard reports show a basic percentage of total under the main metrics. However, this feature is completely missing in Explorations, meaning you cannot natively see the percentage contribution of a specific row without exporting the data.

### Why are my percentages not showing up with the extension installed?

This specific feature only works in Freeform Explorations that use the Table visualization. It will not activate if you are using a Funnel, Path, or Cohort exploration. Additionally, ensure the "Total" row is visible on your screen so the extension can perform the calculation.