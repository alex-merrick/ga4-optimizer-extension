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
        "text": "Automatically collected events are baseline interactions that Google Analytics 4 tracks by default without any custom code. These include basic website behaviors like page_view, session_start, first_visit, and user_engagement."
      }
    }, {
      "@type": "Question",
      "name": "What is the user_engagement event in GA4?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "The user_engagement event fires periodically while a visitor is actively engaging with your website or app. Google uses this event to calculate engaged sessions and overall engagement rate, replacing the legacy bounce rate metric."
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
---

Web analysts constantly search for Google's default event definitions because the native documentation is scattered across multiple support pages. Keeping track of exactly what triggers an active engagement metric versus a standard page load is frustrating when you are deep in a custom exploration.

Whether you are auditing a new tracking setup or building a measurement plan, having a reliable cheat sheet of standard event taxonomy saves you from constantly referencing external documents. 

Below is the complete list of standard GA4 events and their exact definitions. We also outline how you can eliminate the need to memorize these definitions entirely by injecting them directly into your reporting interface.

## The Better Way to View GA4 Event Definitions

You can bookmark this page and refer back to it every time you forget a definition. However, forcing your team to switch tabs between Google Analytics and a separate glossary breaks your analysis workflow.

There is a much faster method. You can install the free [GA4 Optimizer Chrome Extension](https://chromewebstore.google.com/detail/ga4-optimizer/hlldjkhoepkephgaeifgbelgchncfnjj?utm_source=gaoptimizer.com&utm_medium=website&utm_campaign=blog_standard_events_list). 

The extension includes a built-in **Data Dictionary** feature that comes pre-loaded with every standard event definition listed below. Once installed, a small information icon appears next to the event names inside your Standard Reports and Explorations. 

Hovering over an event instantly displays its exact definition. You can even use the extension to upload your company's custom tracking plan, ensuring every stakeholder looking at your GA4 property knows exactly what your custom events mean.

<div class="feature-video-container" data-video-name="DataDictionaryBrief"><video autoplay loop muted playsinline aria-label="Demo of Data Dictionary showing tracking plan tooltips in GA4">
                        <source src="/mp4/data-dictionary.mp4" type="video/mp4">
                    </video><div class="play-icon-overlay"></div></div>

## Automatically Collected & Standard GA4 Events

Google divides its standard events into a few core categories based on the type of property you manage. Here are the baseline definitions for web, ecommerce, lead generation, and app interactions.

### Core Web Engagement Events

These are the foundational events that measure how users interact with content on a standard website. Many of these are collected automatically via Enhanced Measurement.

*   **click:** Fired when a user clicks a link that takes them to a different website.
*   **file_download:** Fired when a user downloads a file from the website.
*   **form_start:** Fired when a user begins filling out a form on the website.
*   **form_submit:** Fired when a user successfully submits a form.
*   **page_view:** Fired each time a user views a page on the website.
*   **scroll:** Fired when a user scrolls down the webpage.
*   **search:** Fired when a user explicitly executes a search query.
*   **session_start:** Fired when a user starts a new session on the website or app.
*   **user_engagement:** Fired when the app is in the foreground or webpage is in focus. Often fires when a user leaves the page to calculate total engagement time.
*   **video_start:** Fired when a user starts playing an embedded YouTube video.
*   **video_progress:** Fired when an embedded YouTube video reaches 10%, 25%, 50%, and 75% watch time.
*   **video_complete:** Fired when a user finishes watching an embedded YouTube video.
*   **view_search_results:** Fired each time a user performs a site search, typically triggered by a URL query parameter like ?q=.

### Ecommerce Tracking Events

Retail and direct-to-consumer brands rely on this specific taxonomy to populate GA4's native monetization reports.

*   **view_item_list:** Triggered when a user views a list of items (e.g., a category page or search results).
*   **select_item:** Triggered when a user clicks/selects an item from a list.
*   **view_item:** Triggered when a user views a specific item's detail page.
*   **add_to_wishlist:** A user adds an item to their wishlist or favorites.
*   **add_to_cart:** Triggered when a user adds one or more items to their shopping cart.
*   **remove_from_cart:** Triggered when a user removes an item from their cart.
*   **view_cart:** Triggered when a user views their shopping cart.
*   **begin_checkout:** Triggered when a user starts the checkout process.
*   **add_shipping_info:** Triggered when a user submits their shipping information.
*   **add_payment_info:** Triggered when a user submits their payment information.
*   **purchase:** Triggered when a user completes a purchase.
*   **refund:** Triggered when a refund is issued.
*   **view_promotion:** An internal promotion banner is displayed to the user.
*   **select_promotion:** A user clicks an internal promotion or marketing banner.

### Lead Generation & B2B Events

For B2B companies, GA4 provides a recommended set of events to measure the sales pipeline and lead qualification process.

*   **generate_lead:** Fired when a user submits a lead or requests contact.
*   **qualify_lead:** Fired when a user is marked as meeting the criteria for a qualified lead.
*   **working_lead:** Fired when a user contacts (or is contacted by) a sales representative.
*   **disqualify_lead:** Fired when a prospect is explicitly marked as disqualified.
*   **close_convert_lead:** Fired when a qualified lead successfully converts into a closed customer.
*   **close_unconvert_lead:** Fired when a lead pipeline is closed out as lost or unsuccessful.

### Core App & Gaming Events

If you are tracking an iOS or Android application via Firebase, these events form the backbone of your behavioral data.

*   **first_open:** Fired the very first time a user opens the app after installing it.
*   **app_update:** Fired when a user opens the app after updating it to a new version.
*   **app_remove:** Fired when a user uninstalls the app from their device.
*   **screen_view:** Fired when a user navigates to a new screen within the app.
*   **app_exception:** Fired when the app experiences a crash or an error.
*   **in_app_purchase:** Fired when a user completes a purchase within the app.
*   **tutorial_begin:** Fired when a user starts a guided onboarding tutorial.
*   **tutorial_complete:** Fired when a user successfully completes the tutorial onboarding.
*   **level_start:** Fired when a user starts a new level in a game or tracking module.
*   **level_up:** Fired when a user completes a level and advances to a new one.

Using the exact naming conventions listed above ensures that Google Analytics automatically routes your data into the correct standard reporting dimensions. If you need to distribute this taxonomy to your team, use the [GA4 Optimizer extension](https://chromewebstore.google.com/detail/ga4-optimizer/hlldjkhoepkephgaeifgbelgchncfnjj?utm_source=gaoptimizer.com&utm_medium=website&utm_campaign=blog_standard_events_list) to sync it directly into their interface.

## Frequently Asked Questions

### What are automatically collected events in GA4?

Automatically collected events are baseline interactions that Google Analytics 4 tracks by default without any custom code. These include basic website behaviors like page_view, session_start, first_visit, and user_engagement.

### What is the user_engagement event in GA4?

The user_engagement event fires periodically while a visitor is actively engaging with your website or app. Google uses this event to calculate engaged sessions and overall engagement rate, replacing the legacy bounce rate metric.

### How do I see my custom event definitions in GA4?

By default, GA4 does not display custom event definitions in the reporting interface. You can view them by installing the GA4 Optimizer browser extension, which adds a hoverable Data Dictionary tooltip next to every event name in your reports.