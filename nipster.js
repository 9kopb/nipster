var utils = require('./utils.js'),
fileAll = 'json/packages-all.json',
file = 'json/packages.json';

function updateGithub() {
    process.exit();

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
            if (!repo || ! repo.html_url) {
                console.log('Repo not found for %s', url, repo);
            } else {
                repo.updated = new Date();
            }
            all[key].repo = repo;
            updateGithub();
        });
    } else {
        savePackages();
    }
}

function savePackages() {
    utils.saveJSON(fileAll, all);
    packages = [];
    Object.keys(all).filter(function(key) {
        return all[key].repo;
    }).forEach(function(key) {
        var a = all[key];
        packages.push(['<a href="' + a.repo.html_url + '">' + a.name + '</a>', a.description, a.repo ? a.repo.forks: '', a.repo ? a.repo.watchers: '']);
    });
    packages = {
        aaData: packages,
        lastUpdate: new Date()
    };
    utils.saveJSON(file, packages, function() {
        console.log('DONE!');
    });
}

function setRepoUrl(all) {
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
                            p.repourl = repo;
                    }
                    ['url', 'path', 'private', 'web'].forEach(function(k) {
                        if (repo[k] && repo[k].match(/github/i)) {
                            p.repourl = repo[k];
                        }
                    });
                }
            }
        };
        f(p.repository);
    });
}

console.log('Nipster!');

console.log('Loading packages...');
utils.loadJSON(fileAll, function(err, data) {
    var path = '/-/all/',
    all = data ? data: {};

    console.log('Total packages:', Object.keys(all).length);
    if (all.timestamp) {
        path += 'since?startkey=' + data.timestamp;
    }
    console.log('Path:', path);

    utils.getJSON({
        host: 'registry.npmjs.org',
        path: path
    },
    function(data) {
        Object.keys(data).forEach(function(key) {
            all[key] = data[key];
        });
        console.log('Total packages:', Object.keys(all).length);
        all.timestamp = Date.now();
        utils.saveJSON(fileAll, all);

        setRepoUrl(all);
    });
});

