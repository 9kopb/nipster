var fs = require('fs'),
path = require('path'),
request = require('request');

var raw, file = './packages.json',
fileRaw = './packages-raw.json',
start = new Date();

console.log('Nipster! - %s-%s-%s', start.getFullYear(), start.getMonth() + 1, start.getDate());

try {
    raw = require(fileRaw);
} catch(e) {
    raw = {
        packages: {}
    };
}

updatePackages(raw, function(err, raw) {
    console.log('Total packages: %d', Object.keys(raw.packages).length);

    var repos = getRepositories(raw.packages);
    githubSync(repos, function(repos) {
        var packages = {},
        repoUrls = [],
        authorUrls = [];

        packages.packages = repos.map(function(r, i) {
            var repo = raw.packages[r.name],
            author = repo.author;

            if (r.url) repoUrls[i] = r.url;
            if (author && author.url) authorUrls[i] = repo.author.url;

            return [r.name, repo.description, author && author.name, r.forks, r.watchers];
        });

        packages.repoUrls = repoUrls;
        packages.authorUrls = authorUrls;

        fs.writeFile(file, JSON.stringify(packages), function() {
            console.log('Done');
        });
    });
});

function updatePackages(raw, cb) {
    var path = '/-/all/';
    if (raw.timestamp) path += 'since?startkey=' + raw.timestamp;

    request.get({
        url: 'http://registry.npmjs.org' + path,
        json: true
    },
    function(err, res, data) {
        if (!err) {
            Object.keys(data).forEach(function(key) {
                raw.packages[key] = data[key];
            });
            raw.timestamp = Date.now();
            fs.writeFile(fileRaw, JSON.stringify(raw), function(err) {
                cb(err, raw);
            });
        } else {
            cb(err);
        }
    });
}

function getRepositories(rawPackages) {
    return Object.keys(rawPackages).map(function(k) {
        var p = rawPackages[k],
        urls = [];

        function parseRepo(repo) {
            if (repo) { ['private', 'url', 'web', 'path'].forEach(function(t) {
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

        return {
            name: k,
            url: urls
        };
    }).filter(function(package) {
        var urls = package.url.filter(function(url) {
            return ('' + url).match(/github/);
        }).map(function(url) {
            return url.replace(/(^.*\.com.)|\.git$/g, '');
        });

        if (urls.length > 0) {
            package.url = urls[0];
            return true;
        }
    });
}

function githubSync(repos, cb) {
    function sync(repos, i) {
        var repo;
        if (!i) i = 0;
        if (i < repos.length - 1) {
            repo = repos[i];
            console.log('%d - %s - %s', i, repo.name, repo.url);
            github(repo.url, function(err, data) {
                if (!err) {
                    repo.forks = data.forks;
                    repo.watchers = data.watchers;
                } else {
                    repo.error = err;
                    repo.errorMsg = data;
                }
                sync(repos, i + 1);
            });
        } else {
            cb(repos);
        }
    };
    sync(repos);
}

function github(url, cb) {
    request.get({
        url: 'https://api.github.com/repos/' + url,
        json: true
    },
    function(err, res, data) {
        if (!err) {
            if (!data || ! data.html_url) {
                cb(true, data);
            } else {
                cb(null, data);
            }
        } else {
            cb(err);
        }
    });
}

