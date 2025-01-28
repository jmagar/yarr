export function parseQuality(title) {
    const qualities = ['2160p', '1080p', '720p', 'HDTV', 'WEB-DL', 'BluRay'];
    for (const quality of qualities) {
        if (title.toUpperCase().includes(quality.toUpperCase()))
            return quality;
    }
    return 'Unknown';
}
export function parseLanguage(title) {
    const languages = {
        'VOSTFR': 'French Subtitles',
        'MULTI': 'Multiple Languages',
        'FRENCH': 'French',
        'ENG': 'English'
    };
    for (const [code, lang] of Object.entries(languages)) {
        if (title.toUpperCase().includes(code))
            return lang;
    }
    return 'Unknown';
}
//# sourceMappingURL=parsers.js.map