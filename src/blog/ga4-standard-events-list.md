---
faq_schema: >
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [{
      "@type": "Question",
      "name": "What are automatically collected events in GA4?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Automatically collected events are baseline interactions that Google Analytics 4 tracks by default without any custom code. On websites, these include core behaviors like first_visit, session_start, user_engagement, and page_view."
      }
    }, {
      "@type": "Question",
      "name": "What is the user_engagement event in GA4?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "The user_engagement event fires when a webpage is in focus or an app is in the foreground for at least one second. Google uses this event to measure active engagement time, calculate engaged sessions, and power GA4's engagement rate and bounce rate metrics."
      }
    }, {
      "@type": "Question",
      "name": "How do I see my custom event definitions in GA4?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "By default, GA4 does not display custom event definitions in the reporting interface. You can view them by installing the GA4 Optimizer browser extension, which adds a hoverable Data Dictionary tooltip next to every event name in your reports."
      }
    }]
  }
layout: layouts/post.njk
author: Alex Merrick
title: "Google Analytics Standard Events List and GA4 Definitions"
date: 2026-06-17T08:00:00.000-05:00
publishDate: 2026-06-17T08:00:00.000-05:00
thumbnail: /img/thumbnails/thumb-standard-event-definitions.jpeg
post_image: /img/thumbnails/banner-standard-event-definitions.jpeg
description: "Get the complete GA4 standard events list and their exact definitions for {{ currentYear }}. Learn how to view event tracking definitions directly inside your reporting."
url: "https://www.gaoptimizer.com/blog/ga4-standard-events-list/"
tags:
  - post
  - ga4
  - reporting
  - ga4-fixes
---

Web analysts constantly search for Google's default event definitions because the native documentation is scattered across multiple support pages. Keeping track of exactly what triggers an active engagement metric versus a standard page load-or which events are automatic versus manually implemented—is frustrating when you are deep in a custom exploration.

Whether you are auditing a new tracking setup or building a measurement plan, having a reliable cheat sheet of GA4's standard event taxonomy saves you from constantly referencing external documents.

Below is the complete list of GA4's **automatically collected**, **enhanced measurement**, and **recommended** events with their exact definitions. We also outline how you can eliminate the need to memorize these definitions entirely by injecting them directly into your reporting interface.

## The Better Way to View GA4 Event Definitions

You can bookmark this page and refer back to it every time you forget a definition. However, forcing your team to switch tabs between Google Analytics and a separate glossary breaks your analysis workflow.

There is a much faster method. You can install the free [GA4 Optimizer Chrome Extension](https://chromewebstore.google.com/detail/ga4-optimizer/hlldjkhoepkephgaeifgbelgchncfnjj?utm_source=gaoptimizer.com&utm_medium=website&utm_campaign=blog_standard_events_list).

The extension includes a built-in **Data Dictionary** feature that comes pre-loaded with standard GA4 event definitions. Once installed, a small information icon appears next to the event names inside your Standard Reports and Explorations.

Hovering over an event instantly displays its exact definition. You can even use the extension to upload your company's custom tracking plan, ensuring every stakeholder looking at your GA4 property knows exactly what your custom events mean.

<div class="feature-video-container" data-video-name="DataDictionaryBrief"><video autoplay loop muted playsinline aria-label="Demo of Data Dictionary showing tracking plan tooltips in GA4">
                        <source src="/mp4/data-dictionary.mp4" type="video/mp4">
                    </video><div class="play-icon-overlay"></div></div>

## Automatically Collected & Enhanced Measurement Events

Google divides its built-in events into **Automatically Collected Events** (always on when using the Google tag or Firebase SDK) and **Enhanced Measurement Events** (web-only interactions that can be toggled on or off in your Data Stream settings without writing code).

### Core Web Engagement Events

These foundational events measure baseline traffic and content engagement on websites.

*   **first_visit** *(Auto - Web & Android Instant Apps)*: Fired the first time a user visits a website or launches an Android instant app with Analytics enabled.
*   **session_start** *(Auto - Web & App)*: Fired when a user starts a new session on the website or app, generating a new session ID and session number.
*   **user_engagement** *(Auto - Web & App)*: Fired when the app is in the foreground or webpage is in focus for at least one second. Often fires as a user navigates away or leaves the page to record accumulated engagement time.
*   **page_view** *(Auto / Enhanced Measurement)*: Fired each time a page loads or when the browser history state changes on a single-page application (if enabled under Enhanced Measurement). Base page-load collection cannot be turned off.
*   **scroll** *(Enhanced Measurement)*: Fired the first time a user reaches the bottom of each page (when a 90% vertical scroll depth becomes visible).
*   **click** *(Enhanced Measurement)*: Fired each time a user clicks an outbound link leading away from the current domain (excludes domains configured for cross-domain measurement).
*   **view_search_results** *(Enhanced Measurement)*: Fired each time a user is presented with a site search results page, triggered by default URL query parameters (`q`, `s`, `search`, `query`, or `keyword`, plus any custom parameters you configure).
*   **file_download** *(Enhanced Measurement)*: Fired when a user clicks a link leading to a file with a common extension (e.g., PDF, DOCX, XLSX, CSV, ZIP, MP4, MP3).
*   **form_start** *(Enhanced Measurement)*: Fired the first time a user interacts with a form during a session.
*   **form_submit** *(Enhanced Measurement)*: Fired when a user submits a form (note: triggers on the DOM submit event and does not guarantee form validation succeeded).
*   **video_start** *(Enhanced Measurement)*: Fired when a user starts playing an embedded YouTube video with JS API support enabled.
*   **video_progress** *(Enhanced Measurement)*: Fired when an embedded YouTube video (with JS API support enabled) progresses past 10%, 25%, 50%, and 75% of its duration.
*   **video_complete** *(Enhanced Measurement)*: Fired when an embedded YouTube video (with JS API support enabled) finishes playing.

### Automatically Collected App Events (Firebase)

If you are tracking an iOS or Android application via the Google Analytics for Firebase SDK, these events are collected automatically (platform limitations and required integrations are noted below).

*   **first_open:** Fired the first time a user launches the app after installing or re-installing it.
*   **app_update:** Fired when a user launches the app after updating it to a new version.
*   **app_remove** *(Android only)*: Fired when an application package is uninstalled from an Android device.
*   **app_clear_data** *(Android only)*: Fired when a user resets or clears app data, removing all settings and sign-in information.
*   **os_update:** Fired when the device operating system is updated to a new version.
*   **screen_view:** Fired when a screen transition occurs and the screen name, class, or ID changes (or no screen was previously set).
*   **app_exception:** Fired when the app crashes or throws an exception (requires Firebase Crashlytics integration).
*   **in_app_purchase:** Fired when a user completes an in-app purchase, including an initial subscription, processed by the Apple App Store or Google Play Store.
*   **app_store_subscription_convert:** Fired when a free-trial subscription converts to a paid subscription.
*   **app_store_subscription_renew:** Fired when a paid subscription is renewed.
*   **app_store_subscription_cancel** *(Android only)*: Fired when a paid subscription is canceled in Google Play.
*   **app_store_refund** *(Android only)*: Fired when an in-app purchase is refunded by Google Play.
*   **firebase_campaign:** Fired when the app is launched with campaign parameters.
*   **ad_click / ad_impression / ad_reward:** Fired for mobile ad clicks, impressions, and rewarded ads when integrated with AdMob (Mobile Ads SDK) or Google Ad Manager.
*   **notification_open / notification_foreground:** Fired when a user opens a Firebase Cloud Messaging (FCM) notification or receives one while the app is in the foreground.
*   **notification_receive / notification_dismiss** *(Android only)*: Fired when an FCM notification is received in the background or dismissed by the user.
*   **firebase_in_app_message_impression / _action / _dismiss** *(Android: `fiam_impression`, `fiam_action`, `fiam_dismiss`)*: Fired when a user sees, acts on, or dismisses a Firebase In-App Message.

## Recommended GA4 Events (Manual Setup)

Unlike automatic events, **Recommended Events** are not collected by default—you must implement them manually via Google Tag Manager, `gtag.js`, or the Firebase SDK. Using Google's exact event names and prescribed parameters unlocks predefined dimensions, metrics, audiences, and native reports across GA4.

### General Events (For All Properties)

Google recommends these cross-industry events for websites and apps across all business verticals. *(Note: `generate_lead`, `purchase`, and `refund` are also included in Google's universal recommendations and are detailed in the Ecommerce and Lead Generation sections below.)*

*   **login:** Fired when a user logs in to your website or app.
*   **sign_up:** Fired when a user signs up for an account.
*   **search:** Fired when a user executes a search on your website or app (useful for apps or websites whose site search does not use URL query parameters).
*   **select_content:** Fired when a user selects a specific piece of content (e.g., clicking a card, article, or media item).
*   **share:** Fired when a user shares content from your website or app.
*   **join_group:** Fired when a user joins a group, such as a community, team, family plan, or guild.
*   **tutorial_begin:** Fired when a user starts an onboarding flow or guided tutorial.
*   **tutorial_complete:** Fired when a user completes the onboarding flow or tutorial.
*   **earn_virtual_currency:** Fired when a user earns virtual currency (such as coins, gems, points, or tokens).
*   **spend_virtual_currency:** Fired when a user spends virtual currency on virtual goods or rewards.
*   **ad_impression** *(App only)*: Fired when a user sees an advertisement (can be logged manually for third-party mediation platforms outside AdMob/Ad Manager).

### Online Sales & Ecommerce Tracking Events

Retail, direct-to-consumer, travel, education, and real estate brands rely on this taxonomy to populate GA4's native Monetization and Ecommerce Purchases reports.

*   **view_item_list:** Triggered when a user views a list of items or offerings (e.g., a category page or search results).
*   **select_item:** Triggered when a user clicks or selects an item from a list.
*   **view_item:** Triggered when a user views a specific item's detail page.
*   **add_to_wishlist:** Triggered when a user adds an item to their wishlist or favorites.
*   **add_to_cart:** Triggered when a user adds one or more items to their shopping cart.
*   **remove_from_cart:** Triggered when a user removes one or more items from their cart.
*   **view_cart:** Triggered when a user views their shopping cart.
*   **begin_checkout:** Triggered when a user starts the checkout process.
*   **add_shipping_info:** Triggered when a user submits their shipping information during checkout.
*   **add_payment_info:** Triggered when a user submits their payment information during checkout.
*   **purchase:** Triggered when a user completes a purchase.
*   **refund:** Triggered when a full or partial refund is issued.
*   **view_promotion:** Triggered when an internal promotion or marketing banner is displayed to the user.
*   **select_promotion:** Triggered when a user clicks an internal promotion or marketing banner.

### Lead Generation & B2B Events

For B2B, automotive, insurance, and offline-conversion funnels, GA4 provides a recommended lifecycle taxonomy to populate the native Lead Acquisition report.

*   **generate_lead:** Fired when a user submits a lead form online or requests contact/information offline.
*   **qualify_lead:** Fired when a user is marked as meeting the criteria for a qualified lead.
*   **working_lead:** Fired when a user contacts (or is contacted by) a sales representative.
*   **disqualify_lead:** Fired when a prospect is explicitly marked as disqualified.
*   **close_convert_lead:** Fired when a qualified lead successfully converts into a closed customer.
*   **close_unconvert_lead:** Fired when a lead is closed out as lost or unconverted.

### Gaming Events

For mobile and web games, these events populate GA4's native Games reports *(alongside `earn_virtual_currency`, `spend_virtual_currency`, `join_group`, `select_content`, `tutorial_begin`, and `tutorial_complete` listed under General Events above)*.

*   **level_start:** Fired when a user starts a new level in a game.
*   **level_end:** Fired when a user completes a level in a game.
*   **level_up:** Fired when a user levels up (e.g., increases their player or character rank).
*   **post_score:** Fired when a user posts or achieves a score.
*   **unlock_achievement:** Fired when a user unlocks an achievement.

Using the exact naming conventions listed above ensures that Google Analytics automatically routes your data into the correct standard reporting dimensions. Once you have implemented your recommended events via GTM or `gtag.js`, verify they are sending the correct parameters by running [GA4 Live Debugger](/ga4-debugger/) on your site. It shows every outgoing hit in a structured feed so you can confirm event names and parameter payloads match the expected schema before checking your reports.

If you need to distribute this taxonomy to your team, use the [GA4 Optimizer extension](https://chromewebstore.google.com/detail/ga4-optimizer/hlldjkhoepkephgaeifgbelgchncfnjj?utm_source=gaoptimizer.com&utm_medium=website&utm_campaign=blog_standard_events_list) to sync it directly into their interface.

## Frequently Asked Questions

<details class="faq-accordion">
  <summary>What are automatically collected events in GA4?</summary>
  <p>Automatically collected events are baseline interactions that Google Analytics 4 tracks by default without any custom code. On websites, these include core behaviors like first_visit, session_start, user_engagement, and page_view.</p>
</details>

<details class="faq-accordion">
  <summary>What is the user_engagement event in GA4?</summary>
  <p>The user_engagement event fires when a webpage is in focus or an app is in the foreground for at least one second. Google uses this event to measure active engagement time, calculate engaged sessions, and power GA4's engagement rate and bounce rate metrics.</p>
</details>

<details class="faq-accordion">
  <summary>How do I see my custom event definitions in GA4?</summary>
  <p>By default, GA4 does not display custom event definitions in the reporting interface. You can view them by installing the GA4 Optimizer browser extension, which adds a hoverable Data Dictionary tooltip next to every event name in your reports.</p>
</details>