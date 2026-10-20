import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

const source = readFileSync(join(process.cwd(), 'src/Wyrmforge.Presentation.Web/wwwroot/index.html'), 'utf8');

function versioner(build) {
    const start = source.indexOf('const versionedResource = ');
    const ending = '\n            };';
    const end = source.indexOf(ending, start);
    assert.ok(start >= 0 && end > start, 'Boot resource resolver must remain available');
    const definition = source.slice(start, end + ending.length);
    // Evaluate the application's unchanged resolver with a synthetic base URI.
    return new Function('document', 'build', definition + '\nreturn versionedResource;')(
        { baseURI: 'https://example.test/Wyrmforge/' }, build);
}

test('identical .NET boot assets keep stable integrity URLs across game releases', () => {
    const prior = versioner('release-a');
    const current = versioner('release-b');
    const hash = 'sha256-Jc9/ab+4=';
    const resource = '_framework/Wyrmforge.Domain.wasm';
    const oldUrl = prior('assembly', resource, resource, hash);
    const newUrl = current('assembly', resource, resource, hash);
    assert.equal(oldUrl, newUrl, 'Do not redownload identical framework assets after each new commit');
    assert.equal(new URL(newUrl).searchParams.get('v'), hash);
    assert.notEqual(current('assembly', resource, resource, 'sha256-nextHash='), newUrl);
});

test('unhashed bootstrap resources still invalidate by build SHA', () => {
    const oldUrl = versioner('release-a')('manifest', 'blazor.boot.json', '_framework/blazor.boot.json');
    const newUrl = versioner('release-b')('manifest', 'blazor.boot.json', '_framework/blazor.boot.json');
    assert.notEqual(oldUrl, newUrl);
    assert.equal(new URL(newUrl).searchParams.get('v'), 'release-b');
    assert.equal(versioner('release-b')('assembly', 'ignored', null), null);
});

test('slow first startup never silently reloads during a healthy download', () => {
    assert.match(source, /FIRST LAUNCH MAY TAKE A MOMENT/);
    assert.match(source, /const recoveryTimer = window\.setTimeout/);
    assert.match(source, /}, 90000\);/);
    assert.match(source, /retry\.addEventListener\("click", \(\) => window\.location\.reload\(\)\)/);
    assert.doesNotMatch(source, /location\.replace\(|sessionStorage\.setItem\(retryKey|}, 9000\);/);
    assert.match(source, /performance\.measure\("wyrmforge:boot"/);
});
