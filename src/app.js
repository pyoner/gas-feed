import clone from 'clone';
import { parse } from './feed';

const UPDATE_FEED_NAME = 'updateFeeds';
const CACHE_EXP = 21600;
const CACHE_MAX_SIZE = 1024 * 100;

let memCache = CacheService.getScriptCache();
let feeds = {
    habr: 'https://habrahabr.ru/rss/',
}

let cacheFolder = getCacheFolder(getScriptFolder());
let cache = {
    get(key) {
        return memCache.get(key) || getCacheFile(cacheFolder, key).getBlob().getDataAsString();
    },
    put(key, value, exp) {
        memCache.put(key, value, exp);
        getCacheFile(cacheFolder, key).setContent(value);
    }
}

function getScriptFolder() {
    let id = ScriptApp.getScriptId();
    let file = DriveApp.getFileById(id);
    let folders = file.getParents();

    let folder = null;
    while (folders.hasNext()) {
        folder = folders.next();
    }
    return folder || DriveApp.getRootFolder();
}

function getCacheFolder(parentFolder, name = '.cache') {
    let folders = parentFolder.getFoldersByName(name);
    if (folders.hasNext()) {
        return folders.next();
    }

    return parentFolder.createFolder(name);
}

function getCacheFile(cacheFolder, name) {
    let files = cacheFolder.getFilesByName(name);
    if (files.hasNext()) {
        return files.next();
    }

    let content = JSON.stringify({});
    return cacheFolder.createFile(name, content, MimeType.JAVASCRIPT);
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
