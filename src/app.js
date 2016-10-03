import clone from 'clone';
import { parse } from './feed';

const UPDATE_FEED_NAME = 'updateFeeds';
const CACHE_EXP = 21600;
const CACHE_MAX_SIZE = 1024 * 100;

let cache = CacheService.getScriptCache();
let feeds = {
    habr: 'https://habrahabr.ru/rss/',
}

function stringifyFeed(obj) {
    let feed = clone(obj);
    while (true) {
        let s = JSON.stringify(feed);
        if (s.length <= CACHE_MAX_SIZE) {
            return s;
        }
        if (feed.entries.length == 0) {
            throw new Error('Feed entries empty');
        }
        feed.entries.splice(-1, 1);
    }
}

function fetchFeed(url) {
    let resp = UrlFetchApp.fetch(url);
    return parse(resp.getContentText());
}

export function doGet(e) {
    let k = e.parameter.get;
    if (!k) {
        return ContentService.createTextOutput('Missing "get" parameter');
    }

    let url = feeds[k];
    if (!url) {
        return ContentService.createTextOutput(`Feed not found for this key "${k}"`);
    }

    let content = cache.get(k);
    if (!content) {
        let feed = fetchFeed(url);
        content = stringifyFeed(feed);
        cache.put(k, content, CACHE_EXP);
    }

    return ContentService
        .createTextOutput(content)
        .setMimeType(ContentService.MimeType.JSON);
}

function updateFeed(k) {
    let feed = fetchFeed(feeds[k]);
    let content = cache.get(k);
    if (content) {
        let cacheFeed = JSON.parse(content);
        let diffEntries = cacheFeed.entries.filter((a) => !feed.entries.some((b) => a.link == b.link));
        feed.entries = feed.entries.concat(diffEntries);
    }
    cache.put(k, stringifyFeed(feed), CACHE_EXP);
}

export function updateFeeds() {
    for (let k in feeds) {
        try {
            updateFeed(k);
        } catch (e) {
            console.error(e);
        }
    }
}

function existsTrigger(triggers, name) {
    return triggers.some((t) => t.getHandlerFunction() == name)
}

function initTrigger(name) {
    let triggers = ScriptApp.getProjectTriggers();
    if (!existsTrigger(triggers, name)) {
        ScriptApp.newTrigger(name)
            .timeBased()
            .everyMinutes(10)
            .create();
    }
}

initTrigger(UPDATE_FEED_NAME);
