var utils = require('./utils.js'),
fileAll = 'json/packages-all.json',
file = 'json/packages.json',
all = {},
cache = process.argv.indexOf('cache') >= 0;

console.log('%s - Starting nipster, cache: %s', new Date(), cache);

function serialize() {
    utils.saveJSON(fileAll, all);
    var packages = {
        list: [],
        updated: new Date()
    };
    Object.keys(all).filter(function(key) {
        return all[key].repo;
    }).forEach(function(key) {
        var a = all[key],
        forks = a.repo ? a.repo.forks: '',
        watchers = a.repo ? a.repo.watchers: '';
        packages.list.push(a.name, a.repo.html_url, a.description, forks, watchers);
    });
    utils.saveJSON(file, packages, function() {
        console.log('DONE!');
    });
}

function updateGithub() {
    var keys = Object.keys(all).filter(function(key) {
        var p = all[key];
        return ! p.repo && p.repository && p.repository.url && p.repository.url.match(/github/i);
    });

    if (keys.length > 0) {
        var key = keys[0],
        origUrl = all[key].repository.url,
        url = origUrl.replace(/(^.*\.com\/)|:|.git$/g, '');

        console.log('%d - %s - %s', keys.length, key, url);

        utils.getJSON({
            host: 'api.github.com',
            path: '/repos/' + url
        },
        function(repo) {
            if (repo.message) {
                console.log(repo);
            }
            repo.updated = new Date();
            all[key].repo = repo;
            if (cache) {
                utils.saveJSON(fileAll, all, function() {
                    updateGithub();
                });
            } else {
                updateGithub();
            }
        });
    } else {
        serialize();
    }
}

function updatePackages() {
    utils.getJSON({
        host: 'registry.npmjs.org'
    },
    function(data) {
        Object.keys(data).forEach(function(key) {
            if (!all[key]) {
                all[key] = data[key];
            }
        });
        updateGithub();
    });
}

if (cache) {
    utils.loadJSON(fileAll, function(err, data) {
        if (!err) {
            Object.keys(data).forEach(function(key) {
                all[key] = data[key];
            });
        }
        updatePackages();
    });
} else {
    updatePackages();
}

