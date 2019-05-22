const bodyParser = require('body-parser');
const exp = require('express');
const exphbs = require('express-handlebars');
const minimist = require('minimist');

const app = exp();

var argv = minimist(process.argv.slice(2));
var dburl = argv.d ? argv.d : 'mongodb://localhost/url-shortener';
var port = (argv.p && argv.p > 0) ? argv.p : 8080;

const shortener = require('./shortener')(dburl);

// Setup handlebars
app.engine('.hbs', exphbs({
    defaultLayout: 'main',
    extname: '.hbs',
    layoutsDir: 'views/layouts'
}));
app.set('view engine', '.hbs');
app.set('views', 'views');

// Enable static file serving from directory 'static'
app.use(exp.static('static'));

// Enable bodyParser for parsing POST parameters into JSON
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Enable the home page
app.get('/', (request, response) => {
    console.log('Retrieving homepage');
    response.render('home');
});

app.get('/view', (request, response) => {
    console.log('Retrieving view page');
    shortener.view(response);
});

// Respond to shorten POST
app.post('/shorten', (request, response) => {
    console.log(`Shortening '${request.body.url}' to '${request.body.code}'`);
    if (request.body.url == '') {
        shortener.retrieve(request.body.code, response, false);
    } else {
        shortener.shorten(request.body.url, request.body.code, response);
    }
});

// Respond to random requests
app.get('/*', (request, response) => {
    console.log(`Retrieving URL '${request.originalUrl}'`);
    shortener.retrieve(request.originalUrl.substr(1), response, true);
})

// Exception reporting
app.use((err, request, response, next) => {
    console.error('An error occurred:', err);
    response.status(500).send('An error occurred: ' + err);
    next();
})

// Start
console.log(`Starting server on port ${port} with database '${dburl}'`);
app.listen(port);