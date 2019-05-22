const exp = require('express');
const exphbs = require('express-handlebars');
const bodyParser = require('body-parser');
const mongo = require('mongodb').MongoClient;

const dburl = 'mongodb://localhost/url-shortener';
const port = 8080;
const app = exp();

// Shorten a URL and store it under @code. If @code is empty, create a new, random key.
function shorten(url, code, response)
{
    // Validate code
    if (code != '') {
        if (code.length < 4 || code.length > 16 || code == 'shorten' || code == 'view') {
            response.render('home', {
                'error-message': 'Invalid URL code'
            });
            return;
        }
    }

    mongo.connect(dburl, async (err, client) => {
        if (err) {
            response.render('home', {
                'error-message': 'Database error: ' + err
            });
            return;
        }

        var db = client.db();

        var count;
        if (code == '') {
            // If no code specified, create a new random code
            do {
                // Note, this is only pseudo-random, but should be fine for this
                // purpose. It won't generate upper-case letters either, but I like it
                // for compactness (stolen from stackoverflow of course...)
                code = (Math.random()+1).toString(36).substr(2,4);

                // If we wanted to be really safe, we'd count how many times this
                // evaluates to true and have some kind of limit.
                count = await db.collection('URLs').countDocuments({'code': code});
            } while(count > 0);
        } else {
            // Check to see that this code doesn't already exist
            count = await db.collection('URLs').countDocuments({'code': code});
            if (count > 0) {
                client.close();
                response.render('home', {
                    'error-message': 'Code already exists'
                });
                return;
            }
        }

        // Insert new shortened URL record
        db.collection('URLs').insertOne({
            'code': code,
            'url': url
        });
        client.close();

        // Display success page
        response.render('result', {
            "url": url,
            "short-url": code
        });
    });
}

// Redirect to a URL stored under @code
function retrieve(code, response, redirect)
{
    mongo.connect(dburl, (err, client) => {
        if (err) {
            response.render('home', {
                'error-message': 'Database error: ' + err
            });
            return;
        }

        var db = client.db();
        db.collection('URLs').findOne({'code': code}).then((result) => {
            if (!result) {
                console.log(`Record '${code}' not found`);
                response.render('home', {
                    'error-message': 'Code not found'
                });
            } else {
                console.log('Found record', result);
                if (redirect) {
                    // Redirect to shortened URL
                    response.redirect(301, result.url);
                } else {
                    // Display shortened URL
                    response.render('result', {
                        "url": result.url,
                        "short-url": code
                    });            
                }
            }
            client.close();
        });
    });
}

function view(response)
{
    // Paging here would be nice, as it is, limit viewing to 100 records
    mongo.connect(dburl, (err, client) => {
        if (err) {
            response.render('home', {
                'error-message': 'Database error: ' + err
            });
            return;
        }

        var db = client.db();
        db.collection('URLs').find({}).sort({$natural:-1}).limit(100).toArray().then((result) => {
            var count = result ? result.length : 0;
            response.render('view', {
                "count": count,
                "records": result
            });
            client.close();
        });
    });
}

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
    view(response);
});

// Respond to shorten POST
app.post('/shorten', (request, response) => {
    console.log(`Shortening '${request.body.url}' to '${request.body.code}'`);
    if (request.body.url == '') {
        retrieve(request.body.code, response, false);
    } else {
        shorten(request.body.url, request.body.code, response);
    }
});

// Respond to random requests
app.get('/*', (request, response) => {
    console.log(`Retrieving URL '${request.originalUrl}'`);
    retrieve(request.originalUrl.substr(1), response, true);
})

// Exception reporting
app.use((err, request, response, next) => {
    console.error('An error occurred:', err);
    response.status(500).send('An error occurred: ' + err);
    next();
})

// Start
console.log(`Starting server on port ${port}`);
app.listen(port);