// Import the markdown-it library at the top
const markdownIt = require("markdown-it");

module.exports = function(eleventyConfig) {
    // --- Asset and File Copying ---
    eleventyConfig.addPassthroughCopy("src/style.css");
    eleventyConfig.addPassthroughCopy("src/global.js");
    eleventyConfig.addPassthroughCopy("src/documentation.js");
    eleventyConfig.addPassthroughCopy("src/icons");
    eleventyConfig.addPassthroughCopy("src/mp4");
    eleventyConfig.addPassthroughCopy("src/img");
    // FIX: Add passthrough for the new JavaScript directory
    eleventyConfig.addPassthroughCopy("src/js");

    // Other root files
    eleventyConfig.addPassthroughCopy("src/CNAME");
    eleventyConfig.addPassthroughCopy("src/BingSiteAuth.xml");
    eleventyConfig.addPassthroughCopy("src/robots.txt");
    eleventyConfig.addPassthroughCopy("src/.nojekyll");
    eleventyConfig.addPassthroughCopy("src/admin");

    // --- Watch Target ---
    eleventyConfig.addWatchTarget("./src/style.css");

    // --- Custom Filter Definition ---
    eleventyConfig.addFilter("fromJson", function (jsonString) {
        return JSON.parse(jsonString);
    });
    
    // --- Current Year Filter ---
    eleventyConfig.addFilter("currentYear", function () {
        return new Date().getFullYear();
    });

    // --- Date Format Filter ---
    // Usage: {{ someDate | date("MMMM d, yyyy") }}
    eleventyConfig.addFilter("date", function (value, format) {
        const d = new Date(value);
        if (isNaN(d)) return value;
        const months = ["January","February","March","April","May","June",
                        "July","August","September","October","November","December"];
        return format
            .replace("MMMM", months[d.getUTCMonth()])
            .replace("d", d.getUTCDate())
            .replace("yyyy", d.getUTCFullYear());
    });
    
    // --- Markdown-It Customization for External Links ---
    const markdownLib = markdownIt({
        html: true,
        breaks: true,
        linkify: true
    });

    const defaultRender = markdownLib.renderer.rules.link_open || function(tokens, idx, options, env, self) {
        return self.renderToken(tokens, idx, options);
    };

    markdownLib.renderer.rules.link_open = function(tokens, idx, options, env, self) {
        const hrefValue = tokens[idx].attrGet('href');
        if (hrefValue && hrefValue.startsWith('http')) {
            tokens[idx].attrPush(['target', '_blank']);
            tokens[idx].attrPush(['rel', 'noopener noreferrer']);
        }
        return defaultRender(tokens, idx, options, env, self);
    };

    eleventyConfig.setLibrary("md", markdownLib);

    // --- Custom Collection for Blog Posts ---
    // Posts with a `publishDate` in the future are excluded at build time.
    // Schedule a daily Netlify build so queued posts go live on their designated day.
    eleventyConfig.addCollection("posts", function(collectionApi) {
        const now = new Date();
        return collectionApi.getFilteredByGlob("src/blog/*.md")
            .filter(function(post) {
                const publishDate = post.data.publishDate
                    ? new Date(post.data.publishDate)
                    : post.date;
                return publishDate <= now;
            })
            .sort(function(a, b) {
                const dateA = a.data.publishDate ? new Date(a.data.publishDate) : a.date;
                const dateB = b.data.publishDate ? new Date(b.data.publishDate) : b.date;
                return dateB - dateA; // newest first
            });
    });

    // --- Base Configuration ---
    return {
        dir: {
            input: "src",
            output: "_site",
            includes: "_includes"
        },
        templateFormats: ["html", "md", "njk"],
        htmlTemplateEngine: "njk",
        markdownTemplateEngine: "njk"
    };
};