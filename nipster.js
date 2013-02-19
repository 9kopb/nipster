var fs = require('fs');
var path = require('path');
var request = require('request');

var dataFile = './data.json';
var outputFile = './packages.json';

var start = new Date();

(function() {
    console.log('Nipster! - %s-%s-%s', start.getFullYear(), start.getMonth() + 1, start.getDate());

    var data = loadData();

    loadOrupdatePackages(data, function() {
        setRepoUrl(data.packages);

        var token = loadToken();
        var sleep = 0;
        var running = false;
        var sec;
        var t = setInterval(function() {
            if (running) return;
            if (Date.now() < sleep) {
                var csec = Math.floor((sleep - Date.now()) / 1000);
                if (csec !== sec) {
                    console.log(csec);
                    sec = csec;
                }
                return;
            }
            sleep = 0;
            running = true;
            var nexts = getNextPackageWithRepo(data.packages);
            if (nexts.length === 0) {
                writePackages(data);
                clearInterval(t);
                return;
            }
            var count = 0;
            nexts.forEach(function(next) {

                console.log(next.name, next.repoUrl);
                github(token, next.repoUrl, function(err, repo, limit) {
                    if (sleep > 0) return;
                    if (limit === 0 || isNaN(limit)) {
                        sleep = Date.now() + 1000 * 60 * 60;
                        running = false;
                        return;
                    }
                    console.log(limit);
                    next.repo = repo;
                    next.lastRun = Date.now();
                    count++;
                    if (count >= nexts.length) {
                        console.log('SAVE!');
                        fs.writeFile(dataFile, JSON.stringify(data), function() {
                            running = false;
                        });
                    }
                });
            });
        }, 1);
        return;
    });
})();

function getNextPackageWithRepo(packages) {
    return Object.keys(packages).filter(function(key) {
        var p = packages[key];
        var runByDate = !p.lastRun || p.lastRun < Date.now() - (1000 * 60 * 60 * 24 * 2);
        return p.repoUrl && runByDate;
    }).map(function(key) {
        return packages[key];
    }).slice(0, 100);
}

function loadData() {
    var data = {};
    try {
        data = require(dataFile);
    } catch (e) {}
    if (!data.packages) data.packages = {};
    return data;
}

function loadOrupdatePackages(data, cb) {
    var path = '/-/all/';
    if (data.timestamp) path += 'since?startkey=' + data.timestamp;

    request.get({
        url: 'http://registry.npmjs.org' + path,
        json: true
    }, function(err, res, d) {
        if (!err) {
            Object.keys(d).forEach(function(key) {
                data.packages[key] = d[key];
            });
            data.timestamp = Date.now();
            fs.writeFile(dataFile, JSON.stringify(data), function(err) {
                console.log('Total packages: %d', Object.keys(data.packages).length);

                cb(err);
            });
        } else {
            cb(err);
        }
    });
}

function setRepoUrl(packages) {
    Object.keys(packages).map(function(k) {
        var p = packages[k];
        var urls = [];

        function parseRepo(repo) {
            if (repo) {

                ['private', 'url', 'web', 'path'].forEach(function(t) {
                    var r = repo[t];
                    if (r) urls.push(r);
                });
                if (typeof repo === 'string') urls.push(repo);
            }
        }

        if (Array.isArray(p.repository)) {
            p.repository.forEach(parseRepo);
        } else {
            parseRepo(p.repository);
        }
        if (p.url) urls.push(p.url);

        p.repoUrl = filterUrls(urls);
    });
}

function filterUrls(urls) {
    urls = urls.filter(function(url) {
        return ('' + url).match(/github/);
    }).map(function(url) {
        return url.replace(/(^.*\.com.)|\.git$/g, '');
    });

    return urls.length > 0 ? urls[0] : false;
}

function loadToken() {
    try {
        return require('./token.json');
    } catch (e) {}
    return '';
}

function github(token, url, cb) {
    request.get({
        url: 'https://api.github.com/repos/' + url,
        json: true,
        headers: {
            Authorization: token
        }
    }, function(err, res, data) {
        if (!err) {
            var limit = parseInt(res.headers['x-ratelimit-remaining'], 10);
            err = !data || !data.html_url;
            cb(err, data, limit);
        } else {
            cb(err, null, 1);
        }
    });
}

function writePackages(packages) {
    var output = {
        aaData: []
    };

    Object.keys(packages.packages).forEach(function(k) {
        var raw = packages.packages[k];

        var name = k;
        var description = raw.description;
        var author = '';
        var modified = new Date(0);
        var forks = 0;
        var stargazers = 0;
        var stars = raw.users ? Object.keys(raw.users).length : 0;
        var npm = '';

        if (raw.repo) {
            var r = raw.repo;

            forks = r.forks;
            stargazers = r.watchers;
            name = r['full_name'] + ' ' + name;
        }

        if (raw.author) {
            var aName = raw.author.name;
            var aUrl = raw.author.url;
            if (aUrl) author = '<a href="' + aUrl + '">' + aName + '</a>';
            else author = aName;
        }

        if (raw.time) modified = new Date(raw.time.modified);

        modified = [modified.getFullYear(), modified.getMonth() + 1, modified.getDate()].join('-');

        output.aaData.push([name, description, author, modified, forks, stargazers, stars, npm]);
    });

    fs.writeFile(outputFile, JSON.stringify(output), function() {
        console.log('Done');
    });
}
