import sanitizer from 'sanitizer';
import striptags from 'striptags';

function toDate(s) {
    let date = Date.parse(s);
    return date ? new Date(date).toISOString() : null;
}

function makeContentSnippet(s) {
    return striptags(s).substring(0, 120);
}

function rss(doc) {
    let container = doc.getRootElement().getChild('channel');

    // entries
    let entries = container.getChildren('item').map(function(node) {

        let content = sanitizer.sanitize(node.getChildText('description'));

        // categories
        let categories = node.getChildren('categories').map(function(node) {
            return node.getText();
        });


        return {
            title: node.getChildText('title'),
            link: node.getChildText('link'),
            content: content,
            contentSnippet: makeContentSnippet(content),
            publishedDate: toDate(node.getChildText('pubDate')),
            categories: categories,
        }
    });

    let feed = {
        title: container.getChildText('title'),
        link: container.getChildText('link'),
        description: container.getChildText('description') || '',
        author: '',
        entries: entries,
    }

    return feed;
}

function atom(doc) {
    let container = doc.getRootElement();

    // entries
    let entries = container.getChildren('entry').map(function(node) {

        let content = sanitizer.sanitize(node.getChildText('summary'));

        // categories
        let categories = node.getChildren('categories').map(function(node) {
            return node.getText();
        });

        return {
            title: node.getChildText('title'),
            link: node.getChildText('link'),
            content: content,
            contentSnippet: makeContentSnippet(content),
            publishedDate: toDate(node.getChildText('updated')),
            categories: categories,
        }
    });

    let feed = {
        title: container.getChildText('title'),
        link: container.getChildText('link'),
        description: container.getChildText('subtitle') || '',
        author: container.getChildText('author') || '',
        entries: entries,
    }

    return feed;
}

let parsers = {
    rss: rss,
    feed: atom,
}

export function parse(s) {
    let doc = XmlService.parse(s);
    let root = doc.getRootElement();
    let name = root.getName();
    let fn = parsers[name];

    if (fn) {
        return fn(doc);
    } else {
        throw Error('Not Implemented parser for this document');
    }
}
