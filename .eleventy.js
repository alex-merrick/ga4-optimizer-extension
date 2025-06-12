module.exports = function(eleventyConfig) {
    // Tell Eleventy to copy our static assets to the final build folder
    eleventyConfig.addPassthroughCopy("src/style.css");
    eleventyConfig.addPassthroughCopy("src/documentation.js");
    eleventyConfig.addPassthroughCopy("src/icons");
    eleventyConfig.addPassthroughCopy("src/mp4");
    eleventyConfig.addPassthroughCopy("src/img");

    // Copy all other root files like robots.txt, CNAME, etc.
    eleventyConfig.addPassthroughCopy("src/CNAME");
    eleventyConfig.addPassthroughCopy("src/BingSiteAuth.xml");
    eleventyConfig.addPassthroughCopy("src/robots.txt");
    eleventyConfig.addPassthroughCopy("src/_redirects"); // <-- ADD THIS NEW LINE
    
    // Tell Eleventy to copy the admin folder for the CMS
    eleventyConfig.addPassthroughCopy("src/admin");

    // Watch our CSS file for changes
    eleventyConfig.addWatchTarget("./src/style.css");

    // Create a custom collection for blog posts
    eleventyConfig.addCollection("posts", function(collectionApi) {
        return collectionApi.getFilteredByGlob("src/blog/*.md").sort(function(a, b) {
            return b.date - a.date; // Sort posts by date, newest first
        });
    });

    // The base configuration
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