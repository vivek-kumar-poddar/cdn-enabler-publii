/**
 * CDNLinker Plugin Class
 *
 * This plugin replaces local asset URLs with CDN URLs in HTML output and feeds.
 * It works by registering modifiers that intercept content before it's output,
 * then uses regex patterns to find and replace matching URLs.
 *
 * @license GNU AGPLv3
 * @version 0.0.2
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
        this.config = config || {};
        this.runtime = this.buildRuntimeState();
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
        if (!this.isDeployContext(renderer) || !this.runtime.isCdnEnabled || !this.runtime.hasAnyEnabledTarget) {
            return htmlCode;
        }

        // Performance short-circuit: if content does not even look like it has a target
        // attribute or path hint, skip all heavier replacement work.
        // Example: large HTML chunks with only article text avoid expensive regex replacement.
        if (!this.runtime.attributePresenceRegex.test(htmlCode) || !this.runtime.pathHintRegex.test(htmlCode)) {
            return htmlCode;
        }

        const siteContext = this.getSiteContext(renderer);

        return htmlCode.replace(this.runtime.attributeRegex, (match, attribute, quote, value) => {
            const lowerAttribute = attribute.toLowerCase();
            const newValue = lowerAttribute === 'srcset'
                ? this.rewriteSrcsetValue(value, siteContext)
                : this.rewriteCandidateUrl(value, siteContext);

            return `${attribute}=${quote}${newValue}${quote}`;
        });
    }

    /**
     * Handles URL replacements in XML/JSON feeds and sitemaps
     * @param {Object} renderer - Renderer context with file and site info
     * @param {string} content - The feed/sitemap content to process
     * @returns {string} Modified content with CDN URLs
     */
    modifyFeeds(renderer, content) {
        if (!this.isDeployContext(renderer) || !this.runtime.isCdnEnabled || !renderer.site || !renderer.site.url) {
            return content;
        }

        const fileName = (renderer.file || '').toLowerCase();
        const shouldModify = (
            (fileName.endsWith('feed.xml') && this.config.enableXmlFeed) ||
            (fileName.endsWith('feed.json') && this.config.enableJsonFeed) ||
            (fileName.endsWith('sitemap.xml') && this.config.enableSitemap)
        );

        if (!shouldModify) {
            return content;
        }

        if (!this.runtime.pathHintRegex.test(content)) {
            return content;
        }

        const siteContext = this.getSiteContext(renderer);
        if (!siteContext) {
            return content;
        }

        return content.replace(this.runtime.feedUrlRegex, (candidateUrl) => {
            return this.rewriteCandidateUrl(candidateUrl, siteContext);
        });
    }

    /**
     * Builds reusable runtime state once per plugin instance.
     *
     * Why this helps:
     * - Previous behavior rebuilt patterns/regex on every file.
     * - Publish output can contain many HTML files, so this avoids repeated setup work.
     *
     * Example:
     * - 400 generated HTML pages now share one compiled attribute regex and one path-hint regex.
     *
     * @returns {Object} Cached runtime state
     */
    buildRuntimeState() {
        const cleanCdnDomain = this.cleanCdnDomain();
        const includePathRegex = this.compileOptionalRegex(this.config.includePathPattern);
        const excludePathRegex = this.compileOptionalRegex(this.config.excludePathPattern);
        const hasAnyEnabledTarget = Boolean(
            this.config.enableImages ||
            this.config.enableCss ||
            this.config.enableJs ||
            this.config.enableFonts ||
            this.config.enableJsonFeed ||
            this.config.enableXmlFeed ||
            this.config.enableSitemap
        );

        const pathHints = [];
        if (this.config.enableImages) {
            pathHints.push('/media/');
        }
        if (this.config.enableCss || this.config.enableJs || this.config.enableFonts) {
            pathHints.push('/assets/', '/themes/');
        }
        if (this.config.enableJsonFeed) pathHints.push('feed.json');
        if (this.config.enableXmlFeed) pathHints.push('feed.xml');
        if (this.config.enableSitemap) pathHints.push('sitemap.xml');

        const hintPattern = pathHints.length > 0
            ? pathHints.map((hint) => this.escapeRegex(hint)).join('|')
            : 'a^';

        return {
            isCdnEnabled: cleanCdnDomain.length > 0,
            cleanCdnDomain,
            configuredProtocol: this.extractConfiguredProtocol(this.config.cdnUrl || ''),
            includePathRegex,
            excludePathRegex,
            hasAnyEnabledTarget,
            fontExtensions: new Set(['woff', 'woff2', 'ttf', 'otf', 'eot', 'svg']),
            attributePresenceRegex: /\b(?:src|href|srcset)\b/i,
            pathHintRegex: new RegExp(`(?:${hintPattern})`, 'i'),
            attributeRegex: /\b(src|href|srcset)\s*=\s*(["'])([^"']*)\2/gi,
            feedUrlRegex: /https?:\/\/[^\s<>"']+|\/\/[^\s<>"']+/gi
        };
    }

    /**
     * Rewrites each candidate URL in srcset while preserving descriptors.
     *
     * Example:
     * Input:
     * "/media/photo-400.jpg 400w, /media/photo-800.jpg 800w"
     * Output:
     * "https://cdn.example.com/media/photo-400.jpg 400w, https://cdn.example.com/media/photo-800.jpg 800w"
     *
     * @param {string} srcsetValue - srcset attribute value
     * @param {Object|null} siteContext - Parsed site context
     * @returns {string}
     */
    rewriteSrcsetValue(srcsetValue, siteContext) {
        return srcsetValue
            .split(',')
            .map((part) => {
                const tokens = part.trim().split(/\s+/);
                if (tokens.length === 0 || !tokens[0]) {
                    return part.trim();
                }

                const [url, ...descriptors] = tokens;
                const rewritten = this.rewriteCandidateUrl(url, siteContext);
                return descriptors.length > 0
                    ? `${rewritten} ${descriptors.join(' ')}`
                    : rewritten;
            })
            .join(', ');
    }

    /**
     * Rewrites a URL to CDN only when it is local/same-origin and path-eligible.
     *
     * Why this helps:
     * - Prevents corrupting third-party URLs.
     * - Keeps external embeds/scripts untouched.
     *
     * Example safety behavior:
     * - Site URL: https://mysite.com
     * - Input: https://third-party.example.com/media/logo.png
     * - Output: unchanged (host mismatch)
     *
     * @param {string} rawUrl - URL candidate from HTML/feed
     * @param {Object|null} siteContext - Parsed site context
     * @returns {string}
     */
    rewriteCandidateUrl(rawUrl, siteContext) {
        const parsed = this.parseRewritableUrl(rawUrl, siteContext);
        if (!parsed) {
            return rawUrl;
        }

        if (!this.isEligiblePath(parsed.path) || !this.passesPathFilters(parsed.path)) {
            return rawUrl;
        }

        const protocol = parsed.protocol || this.getPreferredProtocol(siteContext);
        const cdnBase = this.getCdnBase(protocol);
        return `${cdnBase}${parsed.path}`;
    }

    /**
     * Parses URL candidates into a rewrite-ready shape.
     *
     * Protocol behavior example:
     * - Input: /media/hero.jpg on HTTPS site
     * - Output path/protocol chosen as /media/hero.jpg + https:
     * - Result URL becomes https://cdn.example.com/media/hero.jpg
     * This avoids accidental http:// fallback for secure sites.
     *
     * @param {string} rawUrl
     * @param {Object|null} siteContext
     * @returns {{path:string, protocol:string}|null}
     */
    parseRewritableUrl(rawUrl, siteContext) {
        if (typeof rawUrl !== 'string') {
            return null;
        }

        const candidate = rawUrl.trim();
        if (!candidate) {
            return null;
        }

        // Protocol-relative URL (//example.com/asset.css)
        if (candidate.startsWith('//')) {
            if (!siteContext) {
                return null;
            }

            const parsedProtocolRelative = this.safeParseUrl(`${this.getPreferredProtocol(siteContext)}${candidate}`);
            if (!parsedProtocolRelative || !this.isSameHost(parsedProtocolRelative.host, siteContext.host)) {
                return null;
            }

            return {
                path: this.extractPath(parsedProtocolRelative),
                protocol: parsedProtocolRelative.protocol
            };
        }

        // Root-relative URL (/media/picture.jpg) is always local.
        if (candidate.startsWith('/')) {
            return {
                path: candidate,
                protocol: this.getPreferredProtocol(siteContext)
            };
        }

        // Absolute URL: rewrite only when same host as site URL.
        if (/^https?:\/\//i.test(candidate)) {
            if (!siteContext) {
                return null;
            }

            const parsedAbsolute = this.safeParseUrl(candidate);
            if (!parsedAbsolute || !this.isSameHost(parsedAbsolute.host, siteContext.host)) {
                return null;
            }

            return {
                path: this.extractPath(parsedAbsolute),
                protocol: parsedAbsolute.protocol
            };
        }

        return null;
    }

    /**
     * Path-level eligibility checks driven by user config toggles.
     *
     * Example:
     * - enableCss=true, path=/assets/css/style.css -> eligible
     * - enableCss=false, same path -> not eligible
     *
     * @param {string} path
     * @returns {boolean}
     */
    isEligiblePath(path) {
        const normalizedPath = this.normalizePath(path);
        if (!normalizedPath) {
            return false;
        }

        if (this.config.enableImages && normalizedPath.includes('/media/')) {
            return true;
        }

        const isThemeOrAssetPath = normalizedPath.includes('/assets/') || normalizedPath.includes('/themes/');
        if (isThemeOrAssetPath) {
            const extension = this.getFileExtension(normalizedPath);

            if (this.config.enableCss && extension === 'css') {
                return true;
            }
            if (this.config.enableJs && extension === 'js') {
                return true;
            }
            if (this.config.enableFonts && this.runtime.fontExtensions.has(extension)) {
                return true;
            }
        }

        if (this.config.enableJsonFeed && normalizedPath.endsWith('/feed.json')) {
            return true;
        }

        if (this.config.enableXmlFeed && normalizedPath.endsWith('/feed.xml')) {
            return true;
        }

        if (this.config.enableSitemap && normalizedPath.endsWith('/sitemap.xml')) {
            return true;
        }

        return false;
    }

    /**
     * Optional advanced path filters.
     *
     * Example:
     * - includePathPattern: ^/media/
     * - excludePathPattern: /media/private/
     * - /media/logo.png -> rewritten
     * - /media/private/logo.png -> skipped
     *
     * @param {string} path
     * @returns {boolean}
     */
    passesPathFilters(path) {
        if (this.runtime.includePathRegex && !this.runtime.includePathRegex.test(path)) {
            return false;
        }

        if (this.runtime.excludePathRegex && this.runtime.excludePathRegex.test(path)) {
            return false;
        }

        return true;
    }

    /**
     * Safely builds a RegExp from user input. Invalid patterns are ignored.
     *
     * @param {string} patternText
     * @returns {RegExp|null}
     */
    compileOptionalRegex(patternText) {
        if (typeof patternText !== 'string' || !patternText.trim()) {
            return null;
        }

        try {
            return new RegExp(patternText);
        } catch (error) {
            return null;
        }
    }

    /**
     * Gets parsed site context from renderer.
     *
     * @param {Object} renderer
     * @returns {{host:string, protocol:string}|null}
     */
    getSiteContext(renderer) {
        if (!renderer || !renderer.site || !renderer.site.url) {
            return null;
        }

        const siteUrl = this.safeParseUrl(renderer.site.url);
        if (!siteUrl) {
            return null;
        }

        return {
            host: siteUrl.host,
            protocol: siteUrl.protocol
        };
    }

    /**
     * Checks if current rendering context is deploy output.
     *
     * @param {Object} renderer
     * @returns {boolean}
     */
    isDeployContext(renderer) {
        return renderer && renderer.context !== 'preview' && renderer.context !== 'instant-preview';
    }

    /**
     * Returns preferred protocol with safe fallback order:
     * 1) site protocol
     * 2) configured CDN protocol
     * 3) https
     *
     * @param {Object|null} siteContext
     * @returns {string}
     */
    getPreferredProtocol(siteContext) {
        if (siteContext && (siteContext.protocol === 'https:' || siteContext.protocol === 'http:')) {
            return siteContext.protocol;
        }

        if (this.runtime.configuredProtocol) {
            return this.runtime.configuredProtocol;
        }

        return 'https:';
    }

    /**
     * Builds CDN base (protocol + domain).
     *
     * @param {string} protocol
     * @returns {string}
     */
    getCdnBase(protocol) {
        const protocolPrefix = protocol === 'http:' ? 'http://' : 'https://';
        return `${protocolPrefix}${this.runtime.cleanCdnDomain}`;
    }

    /**
     * Extracts path + query + hash from parsed URL.
     *
     * @param {URL} parsedUrl
     * @returns {string}
     */
    extractPath(parsedUrl) {
        return `${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`;
    }

    /**
     * Gets protocol defined in CDN URL config, if present.
     *
     * @param {string} cdnUrl
     * @returns {string|null}
     */
    extractConfiguredProtocol(cdnUrl) {
        if (typeof cdnUrl !== 'string') {
            return null;
        }

        if (/^https:\/\//i.test(cdnUrl)) {
            return 'https:';
        }

        if (/^http:\/\//i.test(cdnUrl)) {
            return 'http:';
        }

        return null;
    }

    /**
     * Parses URL and returns null for invalid inputs.
     *
     * @param {string} url
     * @returns {URL|null}
     */
    safeParseUrl(url) {
        try {
            return new URL(url);
        } catch (error) {
            return null;
        }
    }

    /**
     * Host comparison helper.
     *
     * @param {string} hostA
     * @param {string} hostB
     * @returns {boolean}
     */
    isSameHost(hostA, hostB) {
        return typeof hostA === 'string' && typeof hostB === 'string' && hostA.toLowerCase() === hostB.toLowerCase();
    }

    /**
     * Removes query/hash and lowercases path for extension/path checks.
     *
     * @param {string} path
     * @returns {string}
     */
    normalizePath(path) {
        if (typeof path !== 'string') {
            return '';
        }

        return path.split(/[?#]/, 1)[0].toLowerCase();
    }

    /**
     * Returns file extension from a normalized path.
     *
     * @param {string} normalizedPath
     * @returns {string}
     */
    getFileExtension(normalizedPath) {
        const lastSlash = normalizedPath.lastIndexOf('/');
        const lastDot = normalizedPath.lastIndexOf('.');

        if (lastDot <= lastSlash) {
            return '';
        }

        return normalizedPath.slice(lastDot + 1);
    }

    /**
     * Cleans the CDN domain
     * @returns {string} Cleaned CDN domain
     */
    cleanCdnDomain() {
        const cdnUrl = typeof this.config.cdnUrl === 'string' ? this.config.cdnUrl : '';
        return cdnUrl.replace(/^(?:https?:)?\/\//i, '').replace(/\/$/, '');
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
