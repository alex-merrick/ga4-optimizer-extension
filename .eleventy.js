// Import the markdown-it library at the top
const markdownIt = require("markdown-it");
const CleanCSS = require("clean-css");
const { minify } = require("terser");
const fs = require("fs");
const path = require("path");

module.exports = function(eleventyConfig) {
    // --- Asset and File Copying ---
    // CSS and JS are handled via transforms below for minification.
    // All other assets are passed through as-is.
    eleventyConfig.addPassthroughCopy("src/icons");
    eleventyConfig.addPassthroughCopy("src/mp4");
    eleventyConfig.addPassthroughCopy("src/img");
    eleventyConfig.addPassthroughCopy("src/js");

    // Other root files
    eleventyConfig.addPassthroughCopy("src/CNAME");
    eleventyConfig.addPassthroughCopy("src/BingSiteAuth.xml");
    eleventyConfig.addPassthroughCopy("src/robots.txt");
    eleventyConfig.addPassthroughCopy("src/llms.txt");
    eleventyConfig.addPassthroughCopy("src/.nojekyll");
    eleventyConfig.addPassthroughCopy("src/admin");

    // --- Watch Targets ---
    eleventyConfig.addWatchTarget("./src/style.css");
    eleventyConfig.addWatchTarget("./src/global.js");
    eleventyConfig.addWatchTarget("./src/documentation.js");

    // --- CSS Minification ---
    // Reads style.css, minifies it, and writes to _site/style.css at build time.
    eleventyConfig.on("eleventy.after", async function({ dir }) {
        const cssSource = path.join("src", "style.css");
        const cssDest = path.join(dir.output, "style.css");
        const raw = fs.readFileSync(cssSource, "utf8");
        const result = new CleanCSS({ level: 2 }).minify(raw);
        if (result.errors.length) {
            console.warn("[clean-css] Errors:", result.errors);
        }
        fs.mkdirSync(path.dirname(cssDest), { recursive: true });
        fs.writeFileSync(cssDest, result.styles);
        const saved = ((1 - result.styles.length / raw.length) * 100).toFixed(1);
        console.log(`[minify] style.css: ${raw.length} → ${result.styles.length} bytes (${saved}% smaller)`);
    });

    // --- JS Minification ---
    // Minifies global.js and documentation.js into _site/ at build time.
    eleventyConfig.on("eleventy.after", async function({ dir }) {
        const jsFiles = ["global.js", "documentation.js"];
        for (const file of jsFiles) {
            const jsSource = path.join("src", file);
            const jsDest = path.join(dir.output, file);
            if (!fs.existsSync(jsSource)) continue;
            const raw = fs.readFileSync(jsSource, "utf8");
            const result = await minify(raw, { compress: true, mangle: true });
            fs.mkdirSync(path.dirname(jsDest), { recursive: true });
            fs.writeFileSync(jsDest, result.code);
            const saved = ((1 - result.code.length / raw.length) * 100).toFixed(1);
            console.log(`[minify] ${file}: ${raw.length} → ${result.code.length} bytes (${saved}% smaller)`);
        }
    });

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