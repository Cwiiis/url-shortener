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
        shortener.dburl = '*malformeddburl*';
        var response = {
            render: function(page, data) {
                assert(page == 'home', 'DB error should go to home page');
                assert(data && data['error-message'].startsWith('Database error: '),
                       'data should contain DB error message');
                shortener.dburl = testDb;
                done();
            }
        };
        shortener.dbConnect(response, function(client) {
            assert(false, 'callback should not be called on failure');
        });
    });
});

describe('#shortener()', function() {
    describe('code parameter validation', function() {
        var response = function(done) {
            return {
                render: function(page, data) {
                    assert(page == 'home', 'code error should go to home page');
                    assert(data && data['error-message'] && data['error-message'] == 'Invalid URL code',
                        'error message should state URL code is invalid');
                    done();
                }
            };
        };
        it('should not allow codes < 4 characters in length', function(done) {
            shortener.shorten('test', '123', response(done));
        });
        it('should not allow codes > 16 characters in length', function(done) {
            shortener.shorten('test', '123456789ABCDEFGH', response(done));
        });
        it('should not allow code of \'shorten\'', function(done) {
            shortener.shorten('test', 'shorten', response(done));
        });
        it('should not allow code of \'view\'', function(done) {
            shortener.shorten('test', 'view', response(done));
        });
    });

    describe('URL storage', function () {
        var response = function(done, url, code) {
            return {
                render: function(page, data) {
                    assert(page == 'result', 'successful URL storage should go to result page');

                    assert(data, 'data object should be valid');
                    assert(data['url'] == url, 'URL on response data should match');
                    if (code) assert(data['short-url'] == code, 'code on response data should match');
                    else assert(data['short-url'].length == 4, 'generated codes should be 4 characters long');

                    mongo.connect(testDb, function(err, client) {
                        var db = client.db();
                        var query = { 'url' : url };
                        if (code) query['code'] = code;
                        db.collection('URLs').findOne(query).then((result) => {
                            assert(result, 'result should be valid');
                            client.close();
                            done();
                        });
                    });
                }
            };
        };
        var dupResponse = function(done) {
            return {
                render: function(page, data) {
                    assert(page == 'home', 'code error should go to home page');
                    assert(data && data['error-message'] && data['error-message'] == 'Code already exists',
                        'error message should state URL code already exists');
                    done();
                }
            };
        };
        it('should store named URLs', function(done) {
            shortener.shorten('url1', 'code1', response(done, 'url1', 'code1'));
        }).timeout(5000);
        it('should store unnamed URLs', function(done) {
            shortener.shorten('url2', '', response(done, 'url2', null));
        }).timeout(5000);
        it('should not store duplicate codes', function(done) {
            shortener.shorten('url3', 'code1', dupResponse(done));
        });
    });
});

describe('#retrieve()', function() {
    it('should redirect previously stored URLs', function(done) {
        var response = {
            redirect: function(code, url) {
                assert(code == 301, 'redirect code should be 301');
                assert(url == 'url1', 'URL should match previously stored URL');
                done();
            }
        };
        shortener.retrieve('code1', response, true);
    });
    it('should display previously stored URLs', function(done) {
        var response = {
            redirect: function(code, url) {
                assert(false, 'redirect should not be called');
            },
            render: function(page, data) {
                assert(page == 'result', 'non-redirect retrieve should go to result page');
                assert(data, 'data on results page should be valid');
                assert(data['url'] == 'url1', 'retrieved URL should match previously stored URL');
                assert(data['short-url'] == 'code1', 'retrieved short URL should match previously stored code');
                done();
            }
        };
        shortener.retrieve('code1', response, false);
    });
    it('should display an error for unknown URL codes', function(done) {
        var response = {
            render: function(page, data) {
                assert(page == 'home', 'unknown code error should go to home page');
                assert(data && data['error-message'] == 'Code not found',
                       'error message should state code not found');
                done();
            }
        };
        shortener.retrieve('unknown-code', response, false);
    });
});

describe('#view()', function() {
    it('should enumerate previously stored URLs, most recent first', function(done) {
        var response = {
            render: function(page, data) {
                assert(page == 'view', 'view should lead to view page');
                assert(data, 'data should be valid');
                assert(data['count'] && data['count'] == 2, 'there should be 2 stored URLs');
                assert(data['records'] && data['records'].length == 2,
                       'there should be 2 returned records');

                var record1 = data['records'][0];
                var record2 = data['records'][1];
                assert(record1['url'] == 'url2', 'first record should be the last stored url');
                assert(record2['url'] == 'url1', 'second record should be the penultimate stored url');
                assert(record2['code'] == 'code1', 'second record should have correct custom code');
                done();
            }
        };
        shortener.view(response);
    });
});