/**
 * Netlify Scheduled Function — Daily Blog Publish Trigger
 *
 * Runs every day at 8:00 AM, 13:00 UTC, and 18:00 UTC. Calls the site's Netlify build hook
 * so any blog posts with a `publishDate` of today (or earlier) go live.
 *
 * Why multiple times?
 *   Eleventy's publishDate filter compares against UTC at build time.
 *   Posts authored with a US timezone offset (e.g. -05:00 or -06:00) won't be
 *   live until their UTC equivalent time has passed. Running at 08:00, 13:00,
 *   and 18:00 UTC covers publish times from midnight to 1 PM ET without
 *   requiring authors to think in UTC.
 *
 * Setup:
 *  1. In Netlify UI → Site Settings → Build & Deploy → Build hooks, create a hook.
 *  2. Copy the hook URL and add it as an environment variable named NETLIFY_BUILD_HOOK_URL.
 *
 * Schedule uses cron syntax: "0 8,13,18 * * *" = 8 AM, 1 PM, 6 PM UTC every day.
 */

const { schedule } = require("@netlify/functions");

const handler = async () => {
    const hookUrl = process.env.NETLIFY_BUILD_HOOK_URL;

    if (!hookUrl) {
        console.error("NETLIFY_BUILD_HOOK_URL environment variable is not set.");
        return { statusCode: 500, body: "Build hook URL not configured." };
    }

    const response = await fetch(hookUrl, { method: "POST" });

    if (!response.ok) {
        console.error(`Build hook failed: ${response.status} ${response.statusText}`);
        return { statusCode: 500, body: "Failed to trigger build." };
    }

    console.log("Scheduled build triggered successfully.");
    return { statusCode: 200, body: "Build triggered." };
};

// Runs daily at 8:00 AM, 1:00 PM, and 6:00 PM UTC
// Covers publish times written in US timezones (ET/CT/MT/PT) without authors needing to think in UTC
exports.handler = schedule("0 8,13,18 * * *", handler);
