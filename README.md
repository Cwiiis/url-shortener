# url-shortener
Requires mongodb installed and running, install with `npm install`, run with `npm start`. Tests can be run with `npm test` and require a bash terminal, or similar. Untested on anything except Windows, but should work fine elsewhere. Port defaults to `8080` and database URL to `mongodb://localhost/url-shortener`, but both can be specified with command-line parameters, like so: `node index.js -p 9090 -d mongodb://localhost/custom-url-shortener`.

# Thoughts
This is very much a first foray for me into server-side application coding, so this code-base may well be riddled with issues and faux pas. I started off by reading a few node tutorials and looking at previous node projects I've written to remind myself of node basics, then I started reading more specific tutorials and articles about servers and database access. express looked nice for serving pages (and I've enjoyed using it), and I quite fancied trying a NoSQL database, for which MongoDB repeatedly came up. There was no overarching design philosophy for this as it's quite a small task, but I've tried to keep it clean and reasonably well commented.

# TODO
These are the obvious things I think would need looking at.
* Move response handling from `shortener.js` to `index.js`
* Add paging to 'View all' page
* Finish unit tests for `shortener.js`
* Add unit tests for `index.js`
* Add web-browser tests (via Selenium?)
* Investigate performance (no idea how it scales right now)