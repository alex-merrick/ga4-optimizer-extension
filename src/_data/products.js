/**
 * Single source of truth for the browser extensions we ship.
 *
 * Consumed by:
 *   - _includes/partials/site-nav.njk          (top nav dropdowns + product-aware CTA)
 *   - _includes/partials/product-context-bar.njk
 *   - _includes/partials/breadcrumbs.njk
 *   - layouts/base.njk                         (footer columns)
 *
 * To add a third extension, append an object here. Nav, footer, CTA, context bar,
 * and breadcrumbs all pick it up with no template changes.
 *
 * A page opts into product context by setting `product: <id>` in its frontmatter.
 * Pages without that key fall back to `defaultId` for the nav CTA only.
 */

const UTM = "utm_source=gaoptimizer.com&utm_medium=website";

/** Appends our standard campaign tracking to a store URL. */
function tagged(url, campaign) {
    const separator = url.includes("?") ? "&" : "?";
    return `${url}${separator}${UTM}&utm_campaign=${campaign}`;
}

const items = [
    {
        id: "ga4-optimizer",
        name: "GA4 Optimizer",
        navLabel: "GA4 Optimizer",
        navDescription: "Faster reporting inside the GA4 interface",
        docsNavLabel: "GA4 Optimizer",
        // /features/ acts as this product's landing page.
        landingUrl: "/features/",
        docsUrl: "/documentation/",
        icon: "/icons/ga4-optimizer-logo.png",
        storeUrl: "https://chromewebstore.google.com/detail/ga4-optimizer/hlldjkhoepkephgaeifgbelgchncfnjj",
        // Nav CTA campaign kept as `nav_cta` so existing reporting stays continuous.
        navCtaLabel: "Add to Chrome",
        navCtaCampaign: "nav_cta",
        contextBarCampaign: "context_bar_install_optimizer",
        // The context bar is scoped to the debugger for now. See plan task 5.
        showContextBar: false,
        showInNav: true,
        navOrder: 1
    },
    {
        id: "ga4-live-debugger",
        name: "GA4 Live Debugger",
        navLabel: "GA4 Live Debugger",
        navDescription: "Inspect hits and dataLayer pushes in real time",
        docsNavLabel: "GA4 Live Debugger",
        landingUrl: "/ga4-debugger/",
        docsUrl: "/ga4-live-debugger-documentation/",
        icon: "/icons/ga4-live-debugger/icon128.png",
        storeUrl: "https://chromewebstore.google.com/detail/akkagamamkhledgmhlljcdiodkgeeiob/",
        navCtaLabel: "Install Free",
        navCtaCampaign: "nav_cta_debugger",
        contextBarCampaign: "context_bar_install_debugger",
        showContextBar: true,
        showInNav: true,
        navOrder: 2
    }
];

// Pre-build tracked install URLs so templates never have to concatenate query strings.
items.forEach(product => {
    product.navCtaUrl = tagged(product.storeUrl, product.navCtaCampaign);
    product.contextBarInstallUrl = tagged(product.storeUrl, product.contextBarCampaign);
});

const list = items.slice().sort((a, b) => a.navOrder - b.navOrder);

module.exports = {
    list,
    navList: list.filter(product => product.showInNav),
    byId: list.reduce((map, product) => {
        map[product.id] = product;
        return map;
    }, {}),
    defaultId: "ga4-optimizer"
};
