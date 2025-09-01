/**
 * CDNLinker Plugin Class
 * 
 * This plugin replaces local asset URLs with CDN URLs in HTML output and feeds.
 * It works by registering modifiers that intercept content before it's output,
 * then uses regex patterns to find and replace matching URLs.
 * 
 * @license GNU AGPLv3
 * @version 0.0.1
 */
class CDNLinker {
    /**
     * Constructor initializes the plugin with API access and configuration
     * @param {Object} API - The plugin API interface
     * @param {string} name - Plugin name
     * @param {Object} config - Plugin configuration containing CDN settings
     */
    constructor(API, name, config) {
        this.API = API;
        this.name = name;
        this.config = config;
    }

    /**
     * Registers content modifiers with the API
     * 
     * This method hooks into different output types:
     * - htmlOutput: Main HTML pages
     * - feedRssOutput: RSS/XML feeds
     * - feedJsonOutput: JSON feeds
     * - sitemapOutput: XML sitemaps
     * 
     * Priority 1 ensures these modifiers run early in the processing chain
     */
    addModifiers() {
        const priority = 1;
        this.API.addModifier('htmlOutput', this.modifyHtml.bind(this), priority, this);
        this.API.addModifier('feedRssOutput', this.modifyFeeds.bind(this), priority, this);
        this.API.addModifier('feedJsonOutput', this.modifyFeeds.bind(this), priority, this);
        this.API.addModifier('sitemapOutput', this.modifyFeeds.bind(this), priority, this);
    }

    /**
     * Main function to handle URL replacements in HTML content
     * 
     * MATCHING STRATEGY:
     * 1. Only processes during deployment (not preview modes)
     * 2. Builds regex patterns based on enabled asset types in config
     * 3. Uses two-stage matching: first finds HTML attributes, then tests URLs
     * 
     * @param {Object} renderer - Renderer context with deployment info
     * @param {string} htmlCode - The HTML content to process
     * @returns {string} Modified HTML with CDN URLs
     */
    modifyHtml(renderer, htmlCode) {
        // Only process during actual deployment, not preview modes
        const isDeploy = (renderer.context !== 'preview' && renderer.context !== 'instant-preview');
        if (!isDeploy || !this.config.cdnUrl) {
            return htmlCode;
        }

        // Build regex patterns based on configuration settings
        const finalPatterns = [];

        // PATTERN 1: Images in /media/ directory
        // Matches: /media/image.jpg, /media/subfolder/pic.png
        if (this.config.enableImages) {
            finalPatterns.push('\\/media\\/');
        }

        // PATTERN 2: Assets by file extension in /assets/ or /themes/
        // This creates targeted matching for specific file types
        const assetExtensions = [];
        if (this.config.enableCss) assetExtensions.push('css');
        if (this.config.enableJs) assetExtensions.push('js');
        if (this.config.enableFonts) assetExtensions.push('woff', 'woff2', 'ttf', 'otf', 'eot', 'svg');

        if (assetExtensions.length > 0) {
            // Creates regex: (?:\/assets\/|\/themes\/).*\.(?:css|js|woff|woff2)(?:\?[^"']*)?
            // Matches: /assets/style.css, /themes/main.js, /assets/font.woff?v=1.2
            // The (?:\?[^"']*) part handles query parameters like ?v=1.2.3
            const assetRegexString = `(?:\\/assets\\/|\\/themes\\/).*\\.(?:${assetExtensions.join('|')})(?:\\?[^"']*)?`;
            finalPatterns.push(assetRegexString);
        }

        // PATTERN 3: Feed files
        // Matches: feed.json, feed.xml (exact filenames)
        if (this.config.enableJsonFeed) finalPatterns.push('feed\\.json');
        if (this.config.enableXmlFeed) finalPatterns.push('feed\\.xml');

        // If no patterns are enabled, return original content
        if (finalPatterns.length === 0) {
            return htmlCode;
        }

        // MATCHING PROCESS:
        // 1. assetUrlTestRegex: Tests if a URL matches any of our patterns
        //    Example: /(?:\/media\/|(?:\/assets\/|\/themes\/).*\.(?:css|js))/
        const assetUrlTestRegex = new RegExp(`(?:${finalPatterns.join('|')})`);

        // 2. attributeRegex: Finds HTML attributes that contain URLs
        //    Matches: src="...", href="...", srcset="..."
        //    Captures: [full_match, attribute_name, attribute_value]
        const attributeRegex = /(src|href|srcset)=["']([^"']+)["']/g;

        return this.performReplacement(htmlCode, attributeRegex, assetUrlTestRegex);
    }

    /**
     * Handles URL replacements in XML/JSON feeds and sitemaps
     * 
     * MATCHING STRATEGY FOR FEEDS:
     * 1. Only processes specific file types based on configuration
     * 2. Uses simple string replacement for /media/ URLs only
     * 3. Preserves the original site's protocol (http/https)
     * 
     * @param {Object} renderer - Renderer context with file and site info
     * @param {string} content - The feed/sitemap content to process
     * @returns {string} Modified content with CDN URLs
     */
    modifyFeeds(renderer, content) {
        // Only process during deployment with valid configuration
        const isDeploy = (renderer.context !== 'preview' && renderer.context !== 'instant-preview');
        if (!isDeploy || !this.config.cdnUrl || !renderer.site || !renderer.site.url) {
            return content;
        }

        // Determine if this file type should be processed
        let shouldModify = false;
        if (renderer.file.endsWith('feed.xml') && this.config.enableXmlFeed) shouldModify = true;
        if (renderer.file.endsWith('feed.json') && this.config.enableJsonFeed) shouldModify = true;
        if (renderer.file.endsWith('sitemap.xml') && this.config.enableSitemap) shouldModify = true;

        if (!shouldModify) {
            return content;
        }

        // Prepare URLs for replacement
        // Remove trailing slashes for consistent URL building
        const siteUrl = renderer.site.url.replace(/\/$/, '');
        const cleanCdnDomain = this.config.cdnUrl.replace(/^(?:https?:)?\/\//, '').replace(/\/$/, '');

        // Preserve the original site's protocol
        const protocol = siteUrl.startsWith('https://') ? 'https://' : 'http://';
        const cdnUrlWithProtocol = `${protocol}${cleanCdnDomain}`;

        const siteUrlMediaRegex = new RegExp(`${siteUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/media/`, 'g');

        return content.replace(siteUrlMediaRegex, `${cdnUrlWithProtocol}/media/`);
    }

    /**
     * Reusable replacement logic for HTML attributes
     * 
     * REPLACEMENT PROCESS:
     * 1. Extracts domain from CDN URL and cleans it
     * 2. Defines inner function to handle individual URL replacements
     * 3. Uses regex to find and replace HTML attributes containing URLs
     * 4. Handles special case of srcset attribute (multiple URLs)
     * 
     * @param {string} content - HTML content to process
     * @param {RegExp} attributeRegex - Regex to find HTML attributes (src, href, srcset)
     * @param {RegExp} assetUrlTestRegex - Regex to test if URL should be replaced
     * @returns {string} Content with CDN URLs
     */
    performReplacement(content, attributeRegex, assetUrlTestRegex) {
        // Clean the CDN domain (remove protocol and trailing slash)
        const cleanCdnDomain = this.config.cdnUrl.replace(/^(?:https?:)?\/\//, '').replace(/\/$/, '');

        /**
         * Inner function to replace domain while preserving protocol
         * 
         * URL MATCHING LOGIC:
         * 1. Skip URLs that don't start with http or / (relative URLs without leading slash)
         * 2. Test URL against our asset patterns (images, CSS, JS, fonts, feeds)
         * 3. Extract the path portion from the URL
         * 4. Rebuild URL with CDN domain and original protocol
         * 
         * @param {string} url - The URL to potentially replace
         * @returns {string} Original URL or CDN URL
         */
        const replaceDomainAndPreserveProtocol = (url) => {
            // Skip non-matching URLs (external links, data URLs, etc.)
            if ((!url.startsWith('http') && !url.startsWith('/')) || !assetUrlTestRegex.test(url)) {
                return url;
            }

            // Determine protocol to use (default to https)
            let protocol = 'https://';
            if (url.startsWith('https://')) protocol = 'https://';
            else if (url.startsWith('http://')) protocol = 'http://';

            // Extract path from URL (everything after domain)
            // Handles both full URLs and root-relative paths
            const pathRegex = /(?:https?:\/\/[^/]+)?(\/.+)/;
            const pathMatch = url.match(pathRegex);

            if (pathMatch && pathMatch[1]) {
                const fullPath = pathMatch[1];
                return `${protocol}${cleanCdnDomain}${fullPath}`;
            }
            return url;
        };

        // ATTRIBUTE REPLACEMENT PROCESS:
        // Find all HTML attributes (src, href, srcset) and replace their values
        return content.replace(attributeRegex, (match, attribute, value) => {
            let newValue;

            // Special handling for srcset attribute (contains multiple URLs)
            // Example: srcset="image1.jpg 1x, image2.jpg 2x, image3.jpg 3x"
            if (attribute === 'srcset') {
                newValue = value.split(',').map(part => {
                    const trimmedPart = part.trim();
                    // Split URL from descriptors (1x, 2x, 480w, etc.)
                    const [url, ...descriptors] = trimmedPart.split(/\s+/);
                    return [replaceDomainAndPreserveProtocol(url), ...descriptors].join(' ');
                }).join(', ');
            } else {
                // Standard src/href attributes contain single URL
                newValue = replaceDomainAndPreserveProtocol(value);
            }
            return `${attribute}="${newValue}"`;
        });
    }
}

// Export the CDNLinker class for use as a plugin
module.exports = CDNLinker;