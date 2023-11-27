// ==UserScript==
// @name         Subclean
// @namespace    http://github.com/SamadiPour
// @author       http://github.com/SamadiPour
// @version      1.1
// @description  Subscene subtitle list cleaner
// @match        https://subscene.com/subtitles/*
// @icon         https://subscene.com/favicon.ico
// @grant        none
// ==/UserScript==

const showAll = true; // make it false to only keep one
const cleanText = true; // make it false if you don't want to see changes in the Release Name/Film title

const cleanMovieNameStringValues = ["'", ":"];

(function() {
    'use strict';

    function removeDuplicates() {
        const uniqueElements = {};

        // group duplicates
        const rows = document.getElementsByTagName('table')[0].querySelectorAll('tr');
        rows.forEach((row) => {
            const anchorElement = row.querySelector('td.a1 a');
            if (anchorElement) {
                const href = anchorElement ? anchorElement.getAttribute('href') : null;
                if (href && !uniqueElements[href]) {
                    uniqueElements[href] = row;
                } else {
                    if (showAll) {
                        const origElement = uniqueElements[href].querySelector('td.a1 a');
                        var spanElement = document.createElement('span');
                        spanElement.className = 'l r';
                        spanElement.textContent = '\u200C';
                        origElement.appendChild(spanElement);
                        origElement.appendChild(anchorElement.children[1]);
                    }
                    row.parentNode.removeChild(row);
                }
            }
        });

        function cleanString(str) {
            let result = str;
            for (let value of cleanMovieNameStringValues) {
                result = result.replace(RegExp(value, 'gi'), '');
            }
            return result;
        }

        // clean the text
        if (cleanText) {
            const movieName = document.getElementsByClassName('header')[0].querySelector('h2').textContent.trim().split('\n')[0];
            const movieNameClean = cleanString(movieName.lastIndexOf(' - ') === -1 ? movieName.trim() : movieName.substring(0, movieName.lastIndexOf(' - ')).trim());
            const newRows = document.getElementsByTagName('table')[0].querySelectorAll('tr');
            newRows.forEach((row) => {
                const anchorElement = row.querySelector('td.a1 a');
                if (anchorElement) {
                    const spans = anchorElement.querySelectorAll('span:nth-child(even)');
                    if (spans) {
                        spans.forEach((span) => {
                            var title = span.innerText;
                            title = title.replace(/\./g, ' ');
                            title = title.replace(RegExp(movieNameClean, 'gi'), '').trim();
                            title = title.replace(/(19|20)\d{2}/gm, '');
                            title = title.replace(/\(\s*\)/g, '').trim();
                            title = title.replace(/ {2,}/g, ' ').trim();
                            title = title.replace(/[\[\]]/g, '').trim();
                            span.innerText = title ? title : movieName;
                        });
                    }
                }
            });
        }
    }

    function observeDOM() {
        var targetNode = document.body;
        var config = { childList: true, subtree: true };
        var callback = function(mutationsList, observer) {
            if (document.querySelector('table')) {
                observer.disconnect();
                removeDuplicates();
            }
        };
        var observer = new MutationObserver(callback);
        observer.observe(targetNode, config);
    }
    observeDOM();
})();
