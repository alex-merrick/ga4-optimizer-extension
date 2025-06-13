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
    eleventyConfig.addPassthroughCopy("src/admin");

    // --- Watch Target ---
    eleventyConfig.addWatchTarget("./src/style.css");

    // --- Custom Filter Definition ---
    eleventyConfig.addFilter("fromJson", function (jsonString) {
        return JSON.parse(jsonString);
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
    eleventyConfig.addCollection("posts", function(collectionApi) {
        return collectionApi.getFilteredByGlob("src/blog/*.md").sort(function(a, b) {
            return b.date - a.date; // Sort posts by date, newest first
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