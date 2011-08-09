var utils = require('./utils.js'),
file = 'json/packages.json',
fileAll = 'json/packages-all.json',
start = new Date(),
packages = {
    packages: [],
    urls: [],
    nongithub: [],
    start: start
};

console.log('Nipster! - %s-%s-%s', start.getFullYear(), start.getMonth() + 1, start.getDate());

function loadAll(callback) {
    var path = '/-/all/';
    console.log('Loading packages...');

    utils.loadJSON(fileAll, function(err, data) {
        var all = data ? data: {};
        console.log('Total packages:', Object.keys(all).length);

        if (all.timestamp) {
            path += 'since?startkey=' + all.timestamp;
        }

        console.log('Path:', path);

        utils.getJSON({
            host: 'registry.npmjs.org',
            path: path
        },
        function(error, data) {
            if (!error) {
                Object.keys(data).forEach(function(key) {
                    all[key] = data[key];
                });
                all.timestamp = Date.now();
                utils.saveJSON(fileAll, all);
                console.log('Total packages:', Object.keys(all).length);
                callback(all);
            }
        });
    });
}

function setGithubUrl(all) {
    Object.keys(all).forEach(function(key) {
        var p = all[key],
        f = function(repo) {
            if (repo) {
                if (Array.isArray(repo)) {
                    repo.forEach(function(r) {
                        f(r);
                    });
                } else {
                    if (typeof repo === 'string' && repo.match(/github/i)) {
                        p.githuburl = repo;
                    } ['url', 'path', 'private', 'web'].forEach(function(k) {
                        if (repo[k] && repo[k].match(/github/i)) {
                            p.githuburl = repo[k];
                        }
                    });
                }
            }
        };
        f(p.repository);
    });
}

function githubAPI(all, callback) {
    var keys = Object.keys(all).filter(function(key) {
        return all[key].githuburl && ! all[key].github;
    });
    if (keys.length > 0) {
        var key = keys[0],
        url = all[key].githuburl.replace(/(^.*\.com.)|\.git$/g, '');

        console.log('%d - %s - %s', keys.length, key, url);

        utils.getJSON({
            host: 'api.github.com',
            path: '/repos/' + url
        },
        function(error, github) {
            if (!error) {
                if (!github || ! github.html_url) {
                    console.log('Repo not found for %s', url, github);
                } else {
                    github.updated = new Date();
                }
                all[key].github = github;
                githubAPI(all, callback);
            } else {
                all[key].github = error;
                delete all[key].githuburl;
                githubAPI(all, callback);
            }
        });
    } else {
        callback();
    }
}

function serialize(all, callback) {
    Object.keys(all).filter(function(key) {
        return all[key].github && all[key].github.html_url;
    }).forEach(function(key) {
        var a = all[key],
        forks = a.github ? a.github.forks: '',
        watchers = a.github ? a.github.watchers: '';
        packages.packages.push([a.name, a.description, forks, watchers]);
        packages.urls.push(a.github.html_url.replace(/.*\.com\//, ''));
    });

    Object.keys(all).filter(function(key) {
        return ! all[key].github;
    }).forEach(function(key) {
        var a = all[key],
        message = a.github ? a.github.message: '';
        packages.nongithub.push([a.name, a.description, message]);
    });

    packages.end = Date.now();

    utils.saveJSON(file, packages, callback);
}

loadAll(function(all) {
    setGithubUrl(all);
    githubAPI(all, function() {
        serialize(all, function() {
            console.log('DONE!');
        });
    });
});

