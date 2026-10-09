---
faq_schema: >
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [{
      "@type": "Question",
      "name": "What is the gtag.config dataLayer event?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "The gtag.config event is a visible dataLayer push introduced by Google in October 2026. It surfaces configuration commands that previously executed silently in the background, standardizing how snippets initialize across websites."
      }
    }, {
      "@type": "Question",
      "name": "Why are my GTM tags double-firing after the October update?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "If you use custom event triggers with wildcard regular expressions (like .*) in Google Tag Manager, those triggers will now catch the new gtag.config event. This causes any tag attached to that trigger to fire an extra time per page load."
      }
    }, {
      "@type": "Question",
      "name": "How do I block the gtag.config event in Google Tag Manager?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "To block the event, edit your global wildcard triggers and add an exception. Create a new trigger exception where the Event exactly matches gtag.config, and apply it to any tag that should not fire on configuration commands."
      }
    }, {
      "@type": "Question",
      "name": "Will the gtag('config') update cause (not set) errors in GA4?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "It can. By forcing the configuration snippet to initialize immediately on container load, the tag may fire before your website has time to push custom dimensions and user properties into the dataLayer. This race condition causes the initial pageview to fire blank, resulting in an increase of (not set) values in your reports."
      }
    }]
  }
layout: layouts/post.njk
author: Alex Merrick
title: "GTM Update: Why the New gtag.config Event Breaks Wildcard Tags"
date: 2026-10-08T09:00:00.000-05:00
publishDate: 2026-10-08T09:00:00.000-05:00
last_modified_at: 2026-10-08T09:00:00.000-05:00
thumbnail: /img/thumbnails/gtm-wild-card.jpg
post_image: /img/thumbnails/gtm-wild-card.jpg
url: "https://www.gaoptimizer.com/blog/gtm-gtag-config-update/"
description: "Google's October {{ currentYear }} update forces hardcoded gtag('config') commands into the dataLayer. Find out if this event causes misfires or (not set) errors."
tags:
  - post
  - gtm
  - gtm-updates
  - ga4-fixes
---

Google just pushed a technical update to Google Tag Manager that will actively break specific, non-standard tracking setups. 

On October 8, {{ currentYear }}, Google standardized how tagging snippets behave across all websites. The update forces `gtm.js` containers to initialize on page load regardless of any existing configuration commands. 

While standardization sounds helpful, the technical execution carries a massive side effect. Commands that used to run silently in the background are now surfacing as highly visible `gtag.config` events in your dataLayer. 

If your website uses a hybrid tracking setup where you mix a Google Tag Manager container with hardcoded `gtag()` snippets in your source code, this update will cause severe tracking issues. Here is exactly what changed, how it inflates your data, and how to fix your triggers today.

## What Just Changed with gtag('config')?

Historically, when you placed a hardcoded `gtag('config')` snippet on your website to route data to Google Analytics or Google Ads, the command operated quietly. It configured the routing properties in the background without flooding your dataLayer array with extra event pushes.

The October update changes this behavior entirely. 

To ensure high performance and reliability across the Google tag ecosystem, Google now forces all configuration commands to surface directly in the dataLayer as visible events. If your website source code contains a `gtag('config', ...)` command, and you open your browser console right now, you will likely see a brand new event firing on page load called `gtag.config`.

**Note for pure GTM users:** If your website runs a 100% clean Google Tag Manager setup and you never use hardcoded `gtag()` commands in your source code, you will not see this new event. This update specifically targets and impacts hybrid setups. If you do not use hardcoded gtag snippets, your setup is safe.

## Risk 1: Wildcard Triggers and Misfiring Tags

Surfacing new events in the dataLayer is only dangerous if your GTM container is built to catch them indiscriminately. Unfortunately, many advanced tracking architectures are built exactly this way.

A common practice for tracking single-page applications (SPAs) or managing Server-Side GTM setups is using a wildcard Custom Event trigger. Analysts will set the event name to match the regular expression `.*`. This tells GTM to fire a specific tag on absolutely every single dataLayer push that occurs.

<img src="/img/wild-card-regex-in-gtm.jpg" alt="Google Tag Manager wildcard custom event trigger using regex matching" width="700" height="350" style="width: 50%; height: auto; border-radius: 8px; border: 1px solid var(--border-color); margin: 20px 0;">

Before this update, a wildcard trigger might catch three standard events during a page load: `gtm.js`, `gtm.dom`, and `gtm.load`. Now, for hybrid sites, that exact same trigger will also catch the new `gtag.config` event. 

### Firing Triggers vs. Exception Triggers
Whether this update actually breaks your tracking depends entirely on how you use your wildcards:

* **If used as a Firing Trigger (You are in danger):** If you attach a `.*` trigger to fire a global custom HTML script or a routing tag, that tag will over-fire today. Tags intentionally firing three times per page will suddenly start firing four or five times. This duplicates your data, inflates your pageview counts, and sends duplicate conversion signals to your advertising platforms.
* **If used as an Exception Trigger (You are safe):** If you only use wildcards to block tags from firing on specific domains or pages, you are safe. The trigger will successfully block the tag on `gtm.js` just like before, and it will now successfully block the tag on `gtag.config` too. The end result is the same.

## Risk 2: Hardcoded Snippets and (not set) Errors

Double-firing wildcard tags are not the only threat this update brings. If your website has a messy tracking setup that mixes hardcoded scripts with Google Tag Manager, you might experience a spike in `(not set)` errors. 

**To be clear: Google is not changing your internal GTM triggers.** If your Google Tag is set to fire on the "All Pages" trigger inside your workspace, it will stay there. You are safe.

However, if your developers placed hardcoded `gtag('config')` snippets directly in your website's source code alongside your GTM container, this update forces those specific snippets to initialize immediately on container load.

Why is that a problem? It introduces a race condition. 

If your hardcoded configuration snippet initializes immediately, it may fire before your website's CMS has time to push context like user IDs, page categories, or consent states into the dataLayer. The initial pageview fires blank because the snippet outpaced your custom variables, causing your reports to fill up with `(not set)` values.

## How to Fix Your GTM Configuration

If your site relies on hardcoded config tags and uses wildcard triggers, you need to audit your trigger logic immediately. Do not delete your wildcard triggers entirely, as your routing tags still rely on them to function. Instead, you need to apply targeted exceptions.

### Step 1: Audit Your Global Triggers
Open your Google Tag Manager workspace and navigate to the Triggers menu. Use the native filter bar to isolate your Custom Event triggers. Look for any trigger where the Event Name is set to use regex matching with the `.*` value. Scroll to the bottom of the trigger settings and check the "Tags Firing On This Trigger" section. If tags are listed there, check each one to see if it is set as a firing trigger. If it is, proceed to step two. If it is set exclusively as an exception trigger, you are safe.

### Step 2: Create a Blocking Exception
You need to instruct GTM to ignore the new configuration push. 
1. Create a new Custom Event trigger.
2. Name it "Exception - Block gtag.config".
3. Set the Event Name to exactly match `gtag.config`.
4. Save the trigger.

### Step 3: Apply the Exception to Your Tags
Go to the tags that use your wildcard triggers. Scroll down to the Triggering section and add your new "Exception - Block gtag.config" as an exception. This guarantees the tag will continue catching all standard dataLayer pushes but will completely ignore the new background configuration commands.

### Step 4: Clean Up Your Base Code
Finally, review your website source code. Google explicitly recommends ensuring all pages use the standardized `gtag.js` snippet properly. If you have legacy code mixing old `analytics.js` commands with modern config snippets, the initialization process will fracture and cause further dataLayer anomalies. Clean your header scripts to match the official modern documentation.

## Validate Your Tags Safely (Without Data Leakage)

Documenting your tags is important, but ensuring they comply with your company's privacy policies is mandatory. You need to validate your data without exposing your internal testing process to external servers. 

The **GA4 Live Debugger** is a 100% local Chrome extension that unwraps `gtag()` commands, monitors your dataLayer pushes, and inspects network hits in real time. Because it runs locally in your browser, your payloads are never sent to external servers or AI training models. 

The latest version includes an automated Security & Compliance Auditor that actively protects your implementation while you test:
* **Live PII Detection:** Automatically flags if your tags are accidentally scraping and sending personal data like emails or phone numbers to GA4. 
* **Server-Side GTM Routing Mismatch:** Verifies that your data is actually routing to your secure cloud server and flags hits that bypass your endpoint to go straight to Google.
* **3rd-Party Pixel X-Ray:** Instantly scans your GTM containers and lists all the marketing vendors loading on your site so you can audit your exposure.

<div class="cta-box" style="background-color: #aa53c418; padding: 30px; border-radius: 8px; text-align: center; margin-top: 40px; margin-bottom: 40px; border: 1px solid var(--border-color);">
    <h3 style="margin-top: 0;">Audit GA4 & GTM Locally</h3>
    <p>Catch PII leaks, validate Server-Side routing, and block test hits on production. Free, secure, and fully local.</p>
    <a href="https://chromewebstore.google.com/detail/akkagamamkhledgmhlljcdiodkgeeiob/?utm_source=gaoptimizer.com&utm_medium=website&utm_campaign=blog_gtag_config_update" class="cta-button" target="_blank" rel="noopener noreferrer">
        Add GA4 Live Debugger to Chrome
    </a>
</div>

## Frequently Asked Questions

<details class="faq-accordion">
<summary>What is the gtag.config dataLayer event?</summary>

The gtag.config event is a visible dataLayer push introduced by Google in October 2026. It surfaces configuration commands that previously executed silently in the background, standardizing how snippets initialize across websites.

</details>

<details class="faq-accordion">
<summary>Why are my GTM tags double-firing after the October update?</summary>

If you use custom event triggers with wildcard regular expressions (like .*) in Google Tag Manager, those triggers will now catch the new gtag.config event. This causes any tag attached to that trigger to fire an extra time per page load.

</details>

<details class="faq-accordion">
<summary>How do I block the gtag.config event in Google Tag Manager?</summary>

To block the event, edit your global wildcard triggers and add an exception. Create a new trigger exception where the Event exactly matches gtag.config, and apply it to any tag that should not fire on configuration commands.

</details>

<details class="faq-accordion">
<summary>Will the gtag('config') update cause (not set) errors in GA4?</summary>

It can. By forcing the configuration snippet to initialize immediately on container load, the tag may fire before your website has time to push custom dimensions and user properties into the dataLayer. This race condition causes the initial pageview to fire blank, resulting in an increase of (not set) values in your reports.

</details>