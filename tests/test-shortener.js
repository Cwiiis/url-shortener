const testDb = 'mongodb://localhost/test-url-shortener';
const assert = require('assert');
const mongo = require('mongodb').MongoClient;
const shortener = require('../shortener')(testDb);

after(function(done) {
    mongo.connect(testDb, function(err, client) {
        var db = client.db();
        db.collection('URLs').drop(function(err, delOk) {
            if (err) console.warn(err);
            client.close();
            done();
        });
    });
});

describe('#dbConnect()', function() {
    it('should call callback with client on success', function(done) {
        shortener.dbConnect(null, function (client) {
            client.close();
            done();
        });
    });

    it('should return an error message on failure', function(done) {
        after(function() {
            shortener.dburl = testDb;
        })
        shortener.dburl = '*malformeddburl*';
        var response = {
            render: function(page, data) {
                assert(page == 'home', 'DB error should go to home page');
                assert(data && data['error-message'], 'Data should contain error message');
                done();
            }
        };
        shortener.dbConnect(response, function (client) {
            client.close();
            done();
        });
    });
});