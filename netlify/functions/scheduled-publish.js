/**
 * Netlify Scheduled Function — Daily Blog Publish Trigger
 *
 * Runs every day at 8:00 AM UTC. Calls the site's Netlify build hook
 * so any blog posts with a `publishDate` of today (or earlier) go live.
 *
 * Setup:
 *  1. In Netlify UI → Site Settings → Build & Deploy → Build hooks, create a hook.
 *  2. Copy the hook URL and add it as an environment variable named NETLIFY_BUILD_HOOK_URL.
 *
 * Schedule uses cron syntax: "0 8 * * *" = 8:00 AM UTC every day.
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

// Runs daily at 8:00 AM UTC
exports.handler = schedule("0 8 * * *", handler);
