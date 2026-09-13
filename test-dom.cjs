const fs = require('fs');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;

const html = fs.readFileSync('dist/index.html', 'utf8');
const dom = new JSDOM(html, {
  url: 'http://localhost/',
  runScripts: 'dangerously',
  resources: 'usable'
});

dom.window.onerror = function(msg, url, line, col, error) {
  console.log('JSDOM ERROR:', msg, error);
};
dom.window.console.error = function(...args) {
  console.log('JSDOM CONSOLE ERROR:', ...args);
};

setTimeout(() => {
  console.log('Finished JSDOM wait');
  process.exit(0);
}, 3000);
