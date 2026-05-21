// Automatically resolves {{ currentYear }} in title and description fields
// for all blog posts, eliminating the need for per-post eleventyComputed blocks.
const currentYear = new Date().getFullYear();

module.exports = {
    eleventyComputed: {
        title: data => {
            if (data.title && typeof data.title === "string") {
                return data.title.replace(/\{\{\s*currentYear\s*\}\}/g, currentYear);
            }
            return data.title;
        },
        description: data => {
            if (data.description && typeof data.description === "string") {
                return data.description.replace(/\{\{\s*currentYear\s*\}\}/g, currentYear);
            }
            return data.description;
        }
    }
};
