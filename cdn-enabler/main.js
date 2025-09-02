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
     * @param {Object} renderer - Renderer context with deployment info
     * @param {string} htmlCode - The HTML content to process
     * @returns {string} Modified HTML with CDN URLs
     */
    modifyHtml(renderer, htmlCode) {
        const isDeploy = (renderer.context !== 'preview' && renderer.context !== 'instant-preview');
        if (!isDeploy || !this.config.cdnUrl) {
            return htmlCode;
        }

        const patterns = this.buildPatterns();
        if (patterns.length === 0) {
            return htmlCode;
        }

        const assetUrlTestRegex = new RegExp(`(?:${patterns.join('|')})`);
        const attributeRegex = /(src|href|srcset)=["']([^"']+)["']/g;

        return this.performReplacement(htmlCode, attributeRegex, assetUrlTestRegex);
    }

    /**
     * Handles URL replacements in XML/JSON feeds and sitemaps
     * @param {Object} renderer - Renderer context with file and site info
     * @param {string} content - The feed/sitemap content to process
     * @returns {string} Modified content with CDN URLs
     */
    modifyFeeds(renderer, content) {
        const isDeploy = (renderer.context !== 'preview' && renderer.context !== 'instant-preview');
        if (!isDeploy || !this.config.cdnUrl || !renderer.site || !renderer.site.url) {
            return content;
        }

        const shouldModify = (
            (renderer.file.endsWith('feed.xml') && this.config.enableXmlFeed) ||
            (renderer.file.endsWith('feed.json') && this.config.enableJsonFeed) ||
            (renderer.file.endsWith('sitemap.xml') && this.config.enableSitemap)
        );

        if (!shouldModify) {
            return content;
        }

        const siteUrl = renderer.site.url.replace(/\/$/, '');
        const cdnUrlWithProtocol = this.getProtocol(siteUrl) + this.cleanCdnDomain();
        const siteUrlMediaRegex = new RegExp(`${this.escapeRegex(siteUrl)}/media/`, 'g');

        return content.replace(siteUrlMediaRegex, `${cdnUrlWithProtocol}/media/`);
    }

    /**
     * Builds regex patterns based on configuration
     * @returns {string[]} Array of regex patterns
     */
    buildPatterns() {
        const patterns = [];

        if (this.config.enableImages) {
            patterns.push('\\/media\\/');
        }

        const assetExtensions = [];
        if (this.config.enableCss) assetExtensions.push('css');
        if (this.config.enableJs) assetExtensions.push('js');
        if (this.config.enableFonts) assetExtensions.push('woff', 'woff2', 'ttf', 'otf', 'eot', 'svg');

        if (assetExtensions.length > 0) {
            patterns.push(`(?:\\/assets\\/|\\/themes\\/).*\\.(?:${assetExtensions.join('|')})(?:\\?[^"']*)?`);
        }

        if (this.config.enableJsonFeed) patterns.push('feed\\.json');
        if (this.config.enableXmlFeed) patterns.push('feed\\.xml');

        return patterns;
    }

    /**
     * Reusable replacement logic for HTML attributes
     * @param {string} content - HTML content to process
     * @param {RegExp} attributeRegex - Regex to find HTML attributes
     * @param {RegExp} assetUrlTestRegex - Regex to test if URL should be replaced
     * @returns {string} Content with CDN URLs
     */
    performReplacement(content, attributeRegex, assetUrlTestRegex) {
        const cleanCdnDomain = this.cleanCdnDomain();

        const replaceUrl = (url) => {
            if ((!url.startsWith('http') && !url.startsWith('/')) || !assetUrlTestRegex.test(url)) {
                return url;
            }

            const protocol = this.getProtocol(url);
            const pathMatch = url.match(/(?:https?:\/\/[^/]+)?(\/.+)/);

            if (pathMatch && pathMatch[1]) {
                return `${protocol}${cleanCdnDomain}${pathMatch[1]}`;
            }
            return url;
        };

        return content.replace(attributeRegex, (match, attribute, value) => {
            const newValue = attribute === 'srcset'
                ? value.split(',').map(part => {
                    const [url, ...descriptors] = part.trim().split(/\s+/);
                    return [replaceUrl(url), ...descriptors].join(' ');
                }).join(', ')
                : replaceUrl(value);
            return `${attribute}="${newValue}"`;
        });
    }

    /**
     * Cleans the CDN domain
     * @returns {string} Cleaned CDN domain
     */
    cleanCdnDomain() {
        return this.config.cdnUrl.replace(/^(?:https?:)?\/\//, '').replace(/\/$/, '');
    }

    /**
     * Gets the protocol from a URL
     * @param {string} url - The URL to extract the protocol from
     * @returns {string} The protocol (https:// or http://)
     */
    getProtocol(url) {
        return url.startsWith('https://') ? 'https://' : 'http://';
    }

    /**
     * Escapes special characters in a string for use in a regular expression
     * @param {string} str - The string to escape
     * @returns {string} The escaped string
     */
    escapeRegex(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
}

module.exports = CDNLinker;
