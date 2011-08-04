Nipster!
--
* Githubrated packages!
* 100% uptime!
* Fast and simple!

Npm package search tool hosted on github.
This is a simple static app that weigh npm packages based on forks and watches from github.


The page
---
For index.html and assets for http://eirikb.github.com/nipster/ look at the gh-pages branch
https://github.com/eirikb/nipster/tree/gh-pages

Developing
---
This is how I develop on nipster (dev.sh):
(using simple-server as example, which uses coffee-script)

    sudo npm install coffee-script simple-server -g
    mkdir nipster
    cd nipster
    git clone git@github.com:eirikb/nipster
    git clone git@github.com:eirikb/nipster static/nipster
    cd static/nipster
    git checkout gh-pages
    mv json ../../nipster/
    ln -s ../../nipster/json ./json
    simple-server

Run it like this: 

    sh dev.sh

And open your browser at http://localhost:3000/
