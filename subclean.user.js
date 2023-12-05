// ==UserScript==
// @name         Subclean
// @namespace    http://github.com/SamadiPour
// @author       http://github.com/SamadiPour
// @version      1.2
// @description  Subscene subtitle list cleaner
// @match        https://subscene.com/subtitles/*
// @icon         https://subscene.com/favicon.ico
// @grant        GM_registerMenuCommand
// ==/UserScript==

// Features
const features = {
    cleanText: {
        name: 'Remove unnecessary text',
        default: true,
        key: 'subclean_clean_text_feature'
    },
    textClassification: {
        name: 'Info Cleanup',
        default: true,
        key: 'subclean_parse_text_feature'
    }
};

// Parameters
const cleanMovieNameStringValues = ["'", ":"];

(function () {
    'use strict';

    // Get features and register menu items
    initializeFeatures();

    // Main function
    function removeDuplicates() {
        const uniqueElements = {};
        const rows = document.querySelector('table').querySelectorAll('tr');

        // group duplicates
        rows.forEach((row) => {
            const anchorElement = row.querySelector('td.a1 a');
            if (anchorElement) {
                const href = anchorElement.getAttribute('href');
                if (href && !uniqueElements[href]) {
                    uniqueElements[href] = row;
                } else {
                    mergeDuplicateRows(uniqueElements[href], anchorElement);
                    row.parentNode.removeChild(row);
                }
            }
        });

        // clean the text
        if (features.cleanText.enabled) {
            modifySubtitleText()
        }
    }

    function observeDOM() {
        var targetNode = document.body;
        var config = { childList: true, subtree: true };
        var callback = function (mutationsList, observer) {
            if (document.querySelector('table')) {
                observer.disconnect();
                removeDuplicates();
            }
        };
        var observer = new MutationObserver(callback);
        observer.observe(targetNode, config);
    }

    // ========== Additional functions ==========

    function initializeFeatures() {
        for (const feature in features) {
            const { name, key, default: defaultValue } = features[feature];
            const isEnabled = JSON.parse(localStorage.getItem(key)) ?? defaultValue;

            features[feature].enabled = isEnabled;

            GM_registerMenuCommand(
                isEnabled ? `${name} - Enabled` : `${name} - Disabled`,
                () => toggleFeature(key, isEnabled)
            );
        }
    }

    function toggleFeature(featureKey, currentValue) {
        localStorage.setItem(featureKey, !currentValue);

        if (featureKey === features.textClassification.key && !currentValue) {
            localStorage.setItem(features.cleanText.key, true);
        } else if (featureKey === features.cleanText.key && !currentValue) {
            localStorage.setItem(features.textClassification.key, false);
        }

        location.reload();
    }

    function capitalizeFirstLetter(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }

    function mergeDuplicateRows(originalRow, anchorElement) {
        const origElement = originalRow.querySelector('td.a1 a');
        const spanElement = document.createElement('span');
        spanElement.className = 'l r';

        if (!features.textClassification.enabled) {
            spanElement.textContent = '\u200C';
        }

        origElement.appendChild(spanElement);
        origElement.appendChild(anchorElement.children[1]);
    }


    function modifySubtitleText() {
        // css
        var style = document.createElement('style');
        style.innerHTML = '.subtitles td.a1 span {white-space: pre-line;} .subtitles td.a1 span.l {white-space: initial}';
        document.head.appendChild(style);

        // logic
        const movieName = getMovieNameFromPage();
        const movieNameClean = cleanString(movieName.lastIndexOf(' - ') === -1 ? movieName.trim() : movieName.substring(0, movieName.lastIndexOf(' - ')).trim());
        const newRows = document.getElementsByTagName('table')[0].querySelectorAll('tr');
        newRows.forEach((row) => {
            const anchorElement = row.querySelector('td.a1 a');
            if (anchorElement) {
                const spans = anchorElement.querySelectorAll('span:nth-child(even)');
                let info = [];
                if (spans) {
                    spans.forEach((span) => {
                        var title = span.innerText;
                        title = title.replace(/\./g, ' ');
                        title = title.replace(RegExp(movieNameClean, 'gi'), '').trim();
                        title = title.replace(/(19|20)\d{2}/gm, '');
                        title = title.replace(/\(\s*\)/g, '').trim();
                        title = title.replace(/ {2,}/g, ' ').trim();
                        title = title.replace(/[\[\]]/g, '').trim();
                        if (features.textClassification.enabled) {
                            info.push(title);
                            anchorElement.removeChild(span);
                        } else {
                            span.innerText = title ? title : movieName;
                        }
                    });

                    if (features.textClassification.enabled) {
                        const cleanInfo = cleanUpInfo(info);
                        const spanElement = document.createElement('span');
                        spanElement.innerHTML = cleanInfo;
                        anchorElement.appendChild(spanElement);
                    }
                }
            }
        });
    }

    function cleanString(str) {
        let result = str;
        for (let value of cleanMovieNameStringValues) {
            result = result.replace(RegExp(value, 'gi'), '');
        }
        return result;
    }

    function getSeason(string) {
        let r1 = /(staffel|season|saison|series|temporada)[\s_.-]?(\d{1,4})/i;

        let m1 = string.match(r1);
        if (m1) {
            return m1[0];
        }

        return [];
    }

    function getSeasonAndEpisode(string) {
        const r1 = /s(\d{1,4})[ ]?((?:([epx.-]+\d{1,4})+))/gi
        const r2 = /(\d{1,4})(?=x)((?:([epx]+\d{1,4})+))/gi

        const m1 = string.match(r1);
        const m2 = string.match(r2);

        if (m1) {
            return m1.concat(m2 || []);
        }

        return m2 || [];
    }

    function getCodecs(string) {
        const r1 = /((?:[hx]\.?\s?264)|(?:[hx]\.?265)|(?:hevc))/gi
        // also get 10bit
        const r2 = /((?:10bit))/gi

        const m1 = string.match(r1);
        const m2 = string.match(r2);

        if (m1) {
            return m1.concat(m2 || []);
        }

        return m2 || [];
    }

    function getResolution(string) {
        const r1 = /((?:\d{3,4}[p|i]))/gi
        // also 2k, 4k, 8k
        const r2 = /((?:\d{1}[k]))/gi

        const m1 = string.match(r1);
        const m2 = string.match(r2);

        if (m1) {
            return m1.concat(m2 || []);
        }

        return m2 || [];
    }

    function getQuality(string) {
        const qualities = [
            '(uhd|ultrahd)[ .\-]?(bluray|blueray|bdrip|brrip|dbrip|bd25|bd50|bdmv|blu\-ray)',
            '(bluray|blueray|bdrip|brrip|dbrip|bd25|bd50|bdmv|blu\-ray)', '(dvd|video_ts|dvdrip|dvdr)', '(hddvd|hddvdrip)', '(tv|hdtv|pdtv|dsr|dtb|dtt|dttv|dtv|hdtvrip|tvrip|dvbrip)',
            '(vhs|vhsrip)', '(laserdisc|ldrip)', 'D-VHS', '(hdrip)', '(cam)', '(\sts|telesync|hdts|ht\-ts)', '(tc|telecine|hdtc|ht\-tc)', '(dvdscr)',
            '(\sr5)', '(webrip)', '(web-dl|webdl|web)'
        ];

        // return all matches
        const r1 = new RegExp(qualities.join('|'), 'gi');

        const m1 = string.match(r1);

        if (m1) {
            return m1;
        }

        return [];
    }

    function getMovieNameFromPage() {
        return document.getElementsByClassName('header')[0].querySelector('h2').textContent.trim().split('\n')[0];
    }


    function cleanUpInfo(strings) {
        // get all info and store them in info object
        const info = {
            seasons: [],
            episodes: [],
            codecs: [],
            resolutions: [],
            qualities: []
        };

        strings.forEach(string => {
            info.seasons.push(getSeason(string));
            info.episodes.push(getSeasonAndEpisode(string));
            info.codecs.push(getCodecs(string));
            info.resolutions.push(getResolution(string));
            info.qualities.push(getQuality(string));
        });

        // flatten arrays
        info.seasons = info.seasons.flat();
        info.episodes = info.episodes.flat();
        info.codecs = info.codecs.flat();
        info.resolutions = info.resolutions.flat();
        info.qualities = info.qualities.flat();

        // remove duplicates
        info.seasons = [...new Set(info.seasons)];
        info.episodes = [...new Set(info.episodes)];
        info.codecs = [...new Set(info.codecs)];
        info.resolutions = [...new Set(info.resolutions)];
        info.qualities = [...new Set(info.qualities)];

        // sort based on length
        info.seasons.sort((a, b) => b.length - a.length);
        info.episodes.sort((a, b) => b.length - a.length);
        info.codecs.sort((a, b) => b.length - a.length);
        info.resolutions.sort((a, b) => b.length - a.length);
        info.qualities.sort((a, b) => b.length - a.length);

        // remove all info from strings
        for (let key in info) {
            info[key].forEach(item => {
                strings.forEach((string, index) => {
                    strings[index] = string.replace(item, '');
                });
            });
        }

        // remove all special characters and whitespaces
        let additional = []
        strings.forEach((string, index) => {
            let str = strings[index];
            // remove special characters
            str = str.replace(/[^a-zA-Z0-9\s]/g, '');
            str = str.replace(/\s+/g, ' ');
            str = str.replace(/\s\-/g, ' ');
            str = str.replace(/\-\s/g, ' ');
            str = str.trim();

            additional.push(str);
        });

        // remove duplicates
        additional = [...new Set(additional)];
        additional = additional.filter(str => str.trim() !== '');

        // clean codecs
        var cleanCodecs = info.codecs;
        cleanCodecs = cleanCodecs.map(codec => codec.toUpperCase().replace(/\s/g, ''));
        for (var i = 0; i < cleanCodecs.length; i++) {
            if (cleanCodecs[i].startsWith("H") && cleanCodecs.includes("X" + cleanCodecs[i].substring(1))) {
                cleanCodecs.splice(i, 1);
                i--; // Adjust index after removal
            }
        }
        info.codecs = cleanCodecs;

        let result = "";
        // first write info with key
        if (info.seasons.length > 0) {
            result += "<b>Seasons:</b> " + info.seasons.join(', ') + "<br>";
        }
        if (info.episodes.length > 0) {
            result += "<b>Episode:</b> " + info.episodes.join(', ') + "<br>";
        }
        if (info.resolutions.length > 0) {
            result += "<b>Resolutions:</b> " + info.resolutions.join(', ') + "<br>";
        }
        if (info.codecs.length > 0) {
            result += "<b>Codecs:</b> " + info.codecs.join(', ') + "<br>";
        }
        if (info.qualities.length > 0) {
            result += "<b>Releases:</b> " + info.qualities.join(', ') + "<br>";
        }
        if (additional.length > 0) {
            result += "<b>Encoders:</b> " + additional.join(', ');
        }

        // return restult or if it's empty, just the name of the movie!
        return result.trim() === "" ? getMovieNameFromPage() : result;
    }

    observeDOM();
})();
