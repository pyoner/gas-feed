import { getLog } from 'gas-core';
import test from 'tape';

export function doGet(event) {
    test('test max size of cache', (t) => {
        const CACHE_MAX_SIZE = 1024 * 100;
        let cache = CacheService.getScriptCache();
        let k = 'test_max_size_of_cache_100KB';
        let data = '';

        for (let i = 0; i < CACHE_MAX_SIZE; i++) {
            data += '1';
        }

        t.test('100KB', (t) => {
            cache.put(k, data);
            let result = cache.get(k);
            t.equal(result.length, data.length);
            t.end();
        });

        t.test('> 100KB throw Exception', (t) => {
            let fn = () => cache.put(k, data + '1');
            t.throws(fn);
            t.end();
        });
    });

    return new Promise((resolve, reject) => {
        test.onFinish(() => resolve(ContentService.createTextOutput(getLog())))
    });
}
