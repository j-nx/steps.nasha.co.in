#!/usr/bin/env node
'use strict';

const puppeteer = require('puppeteer');
const path = require('path');
const http = require('http');
const fs = require('fs');

const PORT = 9876;
const ROOT = path.resolve(__dirname, '..');

// Minimal static file server
const server = http.createServer(function (req, res) {
    var filePath = path.join(ROOT, req.url === '/' ? '/tests/SpecRunner.html' : req.url);
    var ext = path.extname(filePath);
    var mime = {
        '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
        '.png': 'image/png', '.json': 'application/json'
    }[ext] || 'text/plain';

    fs.readFile(filePath, function (err, data) {
        if (err) { res.writeHead(404); res.end('Not found: ' + req.url); return; }
        res.writeHead(200, { 'Content-Type': mime });
        res.end(data);
    });
});

(async function () {
    server.listen(PORT);
    var browser, exitCode = 1;
    try {
        browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
        var page = await browser.newPage();

        // Forward console output
        page.on('console', function (msg) {
            var type = msg.type();
            if (type === 'error') console.error('  [console]', msg.text());
            else if (type === 'warning') console.warn('  [console]', msg.text());
        });

        page.on('pageerror', function (err) {
            console.error('  [PAGE ERROR]', err.message);
        });

        await page.goto('http://localhost:' + PORT + '/tests/SpecRunner.html', { waitUntil: 'domcontentloaded' });

        // Wait for Jasmine to finish
        await page.waitForFunction(function () {
            var banner = document.querySelector('.jasmine-alert .jasmine-bar');
            return banner && (banner.classList.contains('jasmine-passed') || banner.classList.contains('jasmine-failed'));
        }, { timeout: 30000 });

        // Extract results
        var results = await page.evaluate(function () {
            var specs = document.querySelectorAll('.jasmine-failures .jasmine-spec-detail');
            var failures = [];
            specs.forEach(function (el) {
                failures.push({
                    name: el.querySelector('.jasmine-description').textContent,
                    messages: Array.from(el.querySelectorAll('.jasmine-result-message')).map(function (m) { return m.textContent; }),
                    stack: Array.from(el.querySelectorAll('.jasmine-stack-trace')).map(function (m) { return m.textContent; })
                });
            });

            var suites = [];
            document.querySelectorAll('.jasmine-results .jasmine-suite-detail').forEach(function (el) {
                suites.push(el.textContent.trim());
            });

            var banner = document.querySelector('.jasmine-alert .jasmine-bar').textContent;
            var passed = document.querySelector('.jasmine-alert .jasmine-bar').classList.contains('jasmine-passed');

            // Get passing spec names
            var passing = [];
            document.querySelectorAll('.jasmine-summary .jasmine-passed').forEach(function (el) {
                if (el.tagName === 'LI') passing.push(el.textContent.trim());
            });

            return { banner: banner, passed: passed, failures: failures, passing: passing };
        });

        // Print failures first, then summary
        if (results.failures.length > 0) {
            console.log('\nFailures (' + results.failures.length + '):\n');
            results.failures.forEach(function (f) {
                console.log('  \x1b[31m✗\x1b[0m ' + f.name);
                f.messages.forEach(function (m) { console.log('    ' + m); });
                f.stack.forEach(function (s) {
                    var lines = s.split('\n').filter(function (l) { return l.indexOf('spec/') !== -1; });
                    if (lines.length) console.log('    at ' + lines[0].trim());
                });
                console.log('');
            });
        }

        console.log((results.passed ? '\x1b[32mPASSED' : '\x1b[31mFAILED') + '\x1b[0m: ' + results.banner);
        console.log(results.passing.length + ' passing, ' + results.failures.length + ' failing\n');

        exitCode = results.passed ? 0 : 1;
    } catch (err) {
        console.error('Runner error:', err.message);
    } finally {
        if (browser) await browser.close();
        server.close();
        process.exit(exitCode);
    }
})();
