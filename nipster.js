var utils = require('./utils.js'),
fileAll = 'json/packages-all.json',
file = 'json/packages.json',
now = new Date();

console.log('%s-%s-%s - Nipster!', now.getFullYear(), now.getMonth() + 1, now.getDate());

function serialize() {
    utils.saveJSON(fileAll, all);
    var packages = {
        packages: [],
        urls: [],
        untracked: [],
        start: start,
        end: new Date()
    };
    Object.keys(all).filter(function(key) {
        return all[key].repo && all[key].repo.html_url;
    }).forEach(function(key) {
        var a = all[key],
        forks = a.repo ? a.repo.forks: '',
        watchers = a.repo ? a.repo.watchers: '';
        packages.packages.push([a.name, a.description, forks, watchers]);
        packages.urls.push(a.repo.html_url);
    });
    Object.keys(all).filter(function(key) {
        return ! all[key].repo;
    }).forEach(function(key) {
        var a = all[key],
        message = a.repo ? a.repo.message: '';
        packages.untracked.push([a.name, message]);
    });
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
                    } ['url', 'path', 'private', 'web'].forEach(function(k) {
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
        all.timestamp = now.getTime();
        utils.saveJSON(fileAll, all);

        setRepoUrl(all);


    });
});

