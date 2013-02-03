var fs = require('fs');
var path = require('path');
var request = require('request');

var packagesFile = './packages-raw.json';
var outputFile = './packages.json';

var start = new Date();

var token = '';
try {
    token = require('./token.json');
} catch (e){}


console.log('Nipster! - %s-%s-%s', start.getFullYear(), start.getMonth() + 1, start.getDate());

var packages = loadPackages();
loadOrupdatePackages(packages, function() {
    setRepoUrl(packages.packages);

    loadAndSetRepos(packages.packages, function() {
        fs.writeFileSync(packagesFile, JSON.stringify(packages));

        writePackages(packages);
    });
});



function loadPackages() {
    try {
        return require(packagesFile);
    } catch (e) {
        return {
            packages: {}
        };
    }
}

function loadOrupdatePackages(packages, cb) {
    var path = '/-/all/';
    if (packages.timestamp) path += 'since?startkey=' + packages.timestamp;

    request.get({
        url: 'http://registry.npmjs.org' + path,
        json: true
    }, function(err, res, data) {
        if (!err) {
            Object.keys(data).forEach(function(key) {
                packages.packages[key] = data[key];
            });
            packages.timestamp = Date.now();
            fs.writeFile(packagesFile, JSON.stringify(packages), function(err) {
                console.log('Total packages: %d', Object.keys(packages.packages).length);

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

function loadAndSetRepos(packages, cb) {
    var prevLimit = '?';
    console.log('Legend: Packages left (github query limit) - package name - package url');

    var names = Object.keys(packages);

    function getRepo(i) {
        if (!i) i = 0;

        if (i >= names.length) {
            cb();
            return;
        }

        var name = names[i];
        var p = packages[name];

        if (!p.repoUrl) {
            getRepo(i + 1);
            return;
        }

        console.log('%d (%s) - %s - %s', names.length - i, prevLimit, name, p.repoUrl);
        github(p.repoUrl, function(err, data, limit) {
            prevLimit = limit;
            if (!err) {
                p.repo = data;
            }

            if (limit > 0) {
                getRepo(i + 1);
            } else {
                sleep = (70 * 60) - (Date.now() - start.getTime()) / 1000;
                sleep = Math.floor(sleep);

                console.log('Limit reached, sleeping for %d seconds (%s)', sleep, new Date());
                setTimeout(function() {
                    getRepo(i + 1);
                }, sleep * 1000);
            }
        });
    }
    getRepo();
}

function github(url, cb) {
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
        var stars = 0;
        var npm = '';

        if (raw.repo) {
            var r = raw.repo;

            forks = r.forks;
            stargazers = r.watchers;

            if (r.author) author = '<a href="' + r.author.url + '">' + r.author.name + '</a>';
            if (r.time) modified = new Date(r.time.modified);
        }

        modified = [modified.getFullYear(), modified.getMonth() + 1, modified.getDate()].join('-');

        output.aaData.push([name, description, author, modified, forks, stargazers, stars, npm]);
    });

    fs.writeFile(outputFile, JSON.stringify(output), function() {
        console.log('Done');
    });
}
