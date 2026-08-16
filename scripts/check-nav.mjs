/**
 * Navigation integrity checks for the built site.
 *
 * Run after `npm run build`:  npm run verify
 *
 * No dependencies on purpose. This asserts the things that are easy to break
 * silently when editing layouts, partials, or product data:
 *   - both extensions are reachable from the header and footer on every page
 *   - the header CTA points at the right store listing for the page's product
 *   - the product context bar and breadcrumbs are scoped to product pages only
 *   - BreadcrumbList JSON-LD parses
 *   - the old client-side CTA hijack has not crept back in
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const SITE_DIR = "_site";

const OPTIMIZER_STORE_ID = "hlldjkhoepkephgaeifgbelgchncfnjj";
const DEBUGGER_STORE_ID = "akkagamamkhledgmhlljcdiodkgeeiob";

const PRODUCT_LINKS = ["/features/", "/ga4-debugger/"];
const DOCS_LINKS = ["/documentation/", "/ga4-live-debugger-documentation/"];

// Pages that carry `product: ga4-live-debugger`.
const DEBUGGER_PAGES = [
    join("ga4-debugger", "index.html"),
    join("ga4-live-debugger-documentation", "index.html")
];

// Passthrough copies that never use our layouts.
const IGNORED_PREFIXES = ["admin"];

const failures = [];
const checks = { run: 0 };

function check(condition, message) {
    checks.run += 1;
    if (!condition) failures.push(message);
}

function collectHtml(dir) {
    const found = [];
    for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) {
            found.push(...collectHtml(full));
        } else if (entry.endsWith(".html")) {
            found.push(full);
        }
    }
    return found;
}

function section(html, openTag, closeTag) {
    const start = html.indexOf(openTag);
    const end = html.indexOf(closeTag, start);
    return start === -1 || end === -1 ? "" : html.slice(start, end);
}

let pages;
try {
    pages = collectHtml(SITE_DIR);
} catch {
    console.error(`Could not read ${SITE_DIR}. Run "npm run build" first.`);
    process.exit(1);
}

check(pages.length > 40, `Expected a full build, found only ${pages.length} HTML files`);

let checked = 0;

for (const file of pages) {
    const rel = relative(SITE_DIR, file);
    if (IGNORED_PREFIXES.includes(rel.split(sep)[0])) continue;
    checked += 1;
    const html = readFileSync(file, "utf8");

    // The uninstall survey uses a deliberately stripped layout with no nav.
    const isSurveyLayout = html.includes("survey-page-body");
    const header = section(html, '<header class="site-header"', "</header>");
    const footer = section(html, '<footer class="site-footer"', "</footer>");
    const isDebuggerPage = DEBUGGER_PAGES.includes(rel);

    if (!isSurveyLayout) {
        check(header.length > 0, `${rel}: no site header found`);

        for (const link of [...PRODUCT_LINKS, ...DOCS_LINKS]) {
            check(
                header.includes(`href="${link}"`),
                `${rel}: header is missing a link to ${link}`
            );
            check(
                footer.includes(`href="${link}"`),
                `${rel}: footer is missing a link to ${link}`
            );
        }

        // Dropdown accessibility contract.
        check(
            (header.match(/nav-dropdown-toggle/g) || []).length === 2,
            `${rel}: expected 2 dropdown toggles in the header`
        );
        check(
            (header.match(/aria-expanded="false"/g) || []).length >= 2,
            `${rel}: dropdown toggles are missing aria-expanded`
        );

        // Product-aware header CTA.
        const expectedStoreId = isDebuggerPage ? DEBUGGER_STORE_ID : OPTIMIZER_STORE_ID;
        const wrongStoreId = isDebuggerPage ? OPTIMIZER_STORE_ID : DEBUGGER_STORE_ID;
        const ctaMatch = header.match(/<a href="([^"]+)" class="cta-button"/);
        check(ctaMatch !== null, `${rel}: header CTA not found`);
        if (ctaMatch) {
            check(
                ctaMatch[1].includes(expectedStoreId),
                `${rel}: header CTA should point at ${expectedStoreId}`
            );
            check(
                !ctaMatch[1].includes(wrongStoreId),
                `${rel}: header CTA points at the wrong extension`
            );
            const expectedCampaign = isDebuggerPage ? "nav_cta_debugger" : "nav_cta";
            check(
                ctaMatch[1].includes(`utm_campaign=${expectedCampaign}`),
                `${rel}: header CTA should use utm_campaign=${expectedCampaign}`
            );
        }
    }

    // Context bar and breadcrumbs are scoped to product pages.
    const hasContextBar = html.includes('class="product-context-bar"');
    const hasBreadcrumbs = html.includes('class="breadcrumbs"');
    const hasBreadcrumbSchema = html.includes('"@type": "BreadcrumbList"');

    if (isDebuggerPage) {
        check(hasContextBar, `${rel}: missing the product context bar`);
        check(hasBreadcrumbs, `${rel}: missing breadcrumbs`);
        check(hasBreadcrumbSchema, `${rel}: missing BreadcrumbList schema`);
        check(
            html.includes(`utm_campaign=context_bar_install_debugger`),
            `${rel}: context bar install link is missing its campaign`
        );

        // Pull each JSON-LD block separately, then pick the breadcrumb one. A single
        // lazy match across the document would span sibling script tags.
        const blocks = [
            ...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)
        ].map(match => match[1].trim());
        const crumbBlock = blocks.find(block => block.includes('"BreadcrumbList"'));
        check(crumbBlock !== undefined, `${rel}: could not isolate BreadcrumbList JSON-LD`);
        if (crumbBlock) {
            try {
                const parsed = JSON.parse(crumbBlock);
                check(
                    Array.isArray(parsed.itemListElement) && parsed.itemListElement.length >= 2,
                    `${rel}: BreadcrumbList needs at least 2 items`
                );
                check(
                    parsed.itemListElement.every(entry => entry.item.startsWith("https://www.gaoptimizer.com")),
                    `${rel}: BreadcrumbList items must use absolute URLs`
                );
            } catch (error) {
                check(false, `${rel}: BreadcrumbList JSON-LD does not parse (${error.message})`);
            }
        }
    } else {
        check(!hasContextBar, `${rel}: context bar should not render on non-product pages`);
        check(!hasBreadcrumbs, `${rel}: breadcrumbs should not render on non-product pages`);
    }

    // The client-side CTA rewrite is gone and should stay gone.
    check(
        !html.includes("navCta"),
        `${rel}: found the old client-side nav CTA hijack`
    );
}

const label = `${checks.run} assertions across ${checked} pages`;

if (failures.length) {
    console.error(`\nNav verification failed (${label}):\n`);
    for (const failure of failures.slice(0, 40)) console.error(`  - ${failure}`);
    if (failures.length > 40) console.error(`  ...and ${failures.length - 40} more`);
    console.error("");
    process.exit(1);
}

console.log(`Nav verification passed: ${label}.`);
