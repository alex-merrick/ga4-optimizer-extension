---
faq_schema: >
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [{
      "@type": "Question",
      "name": "How do I link Google Business Profile to GA4?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Navigate to your GA4 Admin settings, locate the Product links section, and select Google Business Profile links. Click the Link button and follow the on-screen prompts to select the profiles you want to connect. You need Editor or Administrator access in GA4 and Owner or Manager access for the Business Profile. A single GA4 property can be linked to multiple Business Profiles."
      }
    }, {
      "@type": "Question",
      "name": "Why can't I see Google Business Profile data in GA4 Explorations?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Google restricts GBP metrics to a dedicated Standard Reports collection. These metrics cannot be used in custom Explorations, comparisons, or have filters applied. There are also no granular controls to select which specific data points are shared."
      }
    }, {
      "@type": "Question",
      "name": "How long does GA4 keep Google Business Profile data?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "The native integration retains Google Business Profile data on a rolling six-month window. If you select a date range older than six months, GA4 will only display data within that window, even if your selected date range is longer."
      }
    }, {
      "@type": "Question",
      "name": "Does the GA4 and Google Business Profile integration work with subproperties?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "No. Google has confirmed that the GBP integration is not supported for subproperties. You must link your Business Profile directly to a standard GA4 property."
      }
    }]
  }
layout: layouts/post.njk
author: Alex Merrick
title: "GA4 Google Business Profile Integration: Setup & Limits ({{ currentYear }})"
date: 2026-06-11T10:00:00.000-05:00
publishDate: 2026-06-08T10:00:00.000-05:00
thumbnail: /img/thumbnails/gbp-thumb.jpg
post_image: /img/thumbnails/gbp-banner.jpeg
description: "Learn how to connect your Google Business Profile to GA4. Track local calls, directions, and bookings in reporting, plus understand the 6-month data limit."
url: "https://www.gaoptimizer.com/blog/ga4-google-business-profile-integration/"
tags:
  - post
  - ga4
  - updates
---

Google has officially launched a native integration between Google Business Profile and Google Analytics 4. This closes a long-standing measurement gap that frustrated local SEO professionals and performance marketers who had no way to measure off-site actions inside their analytics platform.

Before this integration, measuring Google Business Profile (GBP) performance in Google Analytics relied entirely on UTM parameters. UTM tags only capture users who physically click through to your website. Every off-site action like a phone call, direction request, or direct booking remained invisible to your analytics stack.

By linking these two platforms, you can view off-site local intent signals alongside your on-site behavioral data, correlate local advertising spend with profile engagement, and gain a holistic view of the customer journey. Here is exactly how the integration works, how to set it up, and the limitations you need to understand before building your reports.

## What the GA4 and Google Business Profile Integration Changes

When you link your accounts, a new dedicated Google Business Profile reporting collection automatically appears in your GA4 Reports menu. This collection is only visible when a link exists between the two products. It pulls first-party data directly from Google Maps and Google Search results into your analytics environment.

Google highlights five core benefits of the integration:

- **Centralized reporting:** View key GBP performance metrics directly within Google Analytics instead of switching between dashboards.
- **Understand local impact:** Measure how users interact with your Business Profile, including actions like website clicks, calls, and direction requests.
- **Analyze marketing effectiveness:** See correlations between your local advertising spend and Business Profile engagement, such as direction clicks.
- **Holistic customer journey:** Gain insights into how your Business Profile contributes to traffic and engagement on your website.
- **Multi-profile insights:** If you manage multiple locations, see aggregated performance across all linked Business Profiles from one view.

For businesses running local campaigns or investing heavily in local SEO, this provides a significant signal upgrade. Actions like requesting directions or clicking "Call" indicate a user is much further down the conversion funnel than someone casually browsing a homepage.

## The 7 Local Metrics You Can Now Track

The integration automatically imports seven core interaction types directly into your reporting layer.

1. **Interactions:** The total volume of engagements with your listing across Google Search and Maps.
2. **Website clicks:** Users navigating from your profile to your primary URL.
3. **Calls:** Phone calls initiated directly from the profile button.
4. **Directions:** Requests made for map directions to your physical location.
5. **Messages:** Direct chat messages initiated by users.
6. **Bookings:** Appointments scheduled through native profile integrations.
7. **Menus:** Interactions with your listed menu items.

GA4 displays all seven metrics regardless of your specific business category. This differs from the Google Business Profile performance dashboard, which hides metrics that are not relevant to your business type. You may see empty metric rows for features that do not apply to your operations.

## How to Connect Google Business Profile to GA4

Setting up the connection is a straightforward process within the Admin section of Google Analytics. Ensure you have the correct permissions before starting. You need the Editor or Administrator role on the GA4 property, and the Owner or Manager role on the specific Business Profile.

A single GA4 property can be linked to multiple Google Business Profiles, making this suitable for multi-location businesses that want centralized reporting. For the full official reference, see Google's <a href="https://support.google.com/analytics/answer/16930347" target="_blank" rel="noopener noreferrer">Connect Google Business Profile to Google Analytics</a> support page.

### Step-by-Step Instructions

1. Navigate to the **Admin** panel in your Google Analytics 4 property.
2. Under **Product links**, click **Google Business Profile links**.
3. Click the **Link** button.
4. Follow the on-screen prompts to select the Business Profile(s) you manage and want to link.
5. Review the data sharing information and confirm the link.

### How to Delete a Link

If you need to stop data flow and remove the integration:

1. In **Admin**, under **Product links**, click **Google Business Profile links**.
2. Find the link you wish to remove in the table.
3. Click the options menu (three dots) for that link.
4. Click **Delete**.

Links can only be deleted from within the Google Analytics Admin interface. You need Editor or Administrator rights on the GA4 property to perform this action.

## Limitations You Need to Know

While the integration is a welcome addition, it comes with several strict limitations. Multi-location brands and technical analysts need to account for these constraints before abandoning their existing measurement protocols.

### The 6-Month Data Retention Limit
GA4 retains the imported GBP data on a strict, rolling six-month window. Unlike your standard web event data which can be retained for up to 14 months, local metrics expire quickly. If you run a year-over-year comparison report, GA4 will only display data within that six-month window, even if your selected date range is longer. This makes historical trend analysis impossible without an external data warehouse.

### Aggregated Multi-Location Data
If your business operates multiple physical locations and you link multiple profiles to a single GA4 property, Analytics aggregates all metrics into one combined dataset. There is no native dimension to filter or segment local actions by individual store or branch. Multi-location operators will still need to rely on the GBP Performance API or external dashboards for location-level granularity.

### Blocked from Explorations, Comparisons, and Filters
GBP metrics are restricted entirely to the native Standard Reports collection. You cannot use these metrics in custom Explorations, comparisons, or apply filters to them. There are also no granular controls to select which specific data points are shared. Linking shares all seven metrics listed above automatically.

### Not Supported for Subproperties
Google has confirmed that this integration is not available for GA4 subproperties. You must link your Business Profile directly to a standard GA4 property. Organizations using subproperties to segment data for different teams or regions cannot pass GBP metrics down to those views.

### Data Freshness Delay
Address changes made in your Google Business Profiles will be reflected in Google Analytics after a short delay. If you recently updated a location or moved a business, expect the data to catch up within a few days rather than appearing in real time.

## Enhancing Your Local GA4 Reports

Because Google Business Profile data is locked out of Explorations, you are forced to do all your analysis inside GA4's Standard Reports interface. Standard Reports are notoriously rigid and lack the advanced calculation tools analysts rely on.

You can bypass these interface limitations by installing the free [GA4 Optimizer Chrome Extension](https://chromewebstore.google.com/detail/ga4-optimizer/hlldjkhoepkephgaeifgbelgchncfnjj?utm_source=gaoptimizer.com&utm_medium=website&utm_campaign=blog_ga4_gbp_integration). It injects missing workflow features directly into the GA4 interface, making it much easier to analyze your newly imported local data.

* **Calculate Local Conversion Rates:** Standard reports only show raw totals. Using the extension's [Quick Calculated Metric](/blog/how-to-get-exit-rate-in-ga4-reports/) feature, you can instantly create custom columns on the fly. Divide "Bookings" by "GBP interactions" to see your true local conversion rate without leaving the page.
* **Fix Clunky Date Comparisons:** Since native comparisons are restricted for these metrics, use our Date Range Presets tool to apply fast, accurate period-over-period date selections with a single click.
* **Keep Data Readable:** When reviewing long lists of landing pages associated with local traffic, use the extension's Sticky Headers feature to keep your metric titles visible as you scroll down the page.

If you are looking for more ways to fix the native GA4 interface, check out our guide to the [best Google Analytics browser extensions](/blog/best-google-analytics-browser-extensions-ga4/) available this year.

## Frequently Asked Questions

### How do I link Google Business Profile to GA4?

Navigate to your GA4 Admin settings, locate the Product links section, and select Google Business Profile links. Click the Link button and follow the on-screen prompts to select the profiles you want to connect. You need Editor or Administrator access in GA4 and Owner or Manager access for the Business Profile. A single GA4 property can be linked to multiple Business Profiles.

### Why can't I see Google Business Profile data in GA4 Explorations?

Google restricts GBP metrics to a dedicated Standard Reports collection. These metrics cannot be used in custom Explorations, comparisons, or have filters applied. There are also no granular controls to select which specific data points are shared.

### How long does GA4 keep Google Business Profile data?

The native integration retains Google Business Profile data on a rolling six-month window. If you select a date range older than six months, GA4 will only display data within that window, even if your selected date range is longer.

### Does the GA4 and Google Business Profile integration work with subproperties?

No. Google has confirmed that the GBP integration is not supported for subproperties. You must link your Business Profile directly to a standard GA4 property.