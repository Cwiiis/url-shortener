const mongo = require('mongodb').MongoClient;

module.exports = function(dburl) {
    var module = {};

    module.dburl = dburl;

    module.dbConnect = function(response, callback)
    {
        mongo.connect(this.dburl, async (err, client) => {
            if (err) {
                response.render('home', {
                    'error-message': 'Database error: ' + err
                });
                return;
            }

            callback(client);
        });
    };

    // Shorten a URL and store it under @code. If @code is empty, create a new, random key.
    module.shorten = function(url, code, response)
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

        this.dbConnect(response, async (client) => {
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
    };

    // Redirect to a URL stored under @code
    module.retrieve = function(code, response, redirect)
    {
        this.dbConnect(response, (client) => {
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
    };

    // View all records, sorted by most recent first
    module.view = function(response)
    {
        // Paging here would be nice, as it is, limit viewing to 100 records
        this.dbConnect(response, (client) => {
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
    };

    return module;
};