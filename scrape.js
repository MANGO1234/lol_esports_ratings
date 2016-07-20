'use strict';

var _ = require('lodash');
var printf = require('printf');
var fs = require('fs');
var cheerio = require('cheerio');
var request = require('request');
var rp = require('request-promise');
var leagues = require('./matches/leagues.js');

var l = process.argv[2];
var t = process.argv.length > 3 ? process.argv[3] : leagues[l].current;

function scrape(l, t) {
    var k = leagues[l].tournaments[t].map(function(c) {
        console.log('downloading ' + l + ' ' + t);
        return rp(c.link).then(function(body) {
            var $ = cheerio.load(body);
            var data = $('.wikitable tr');
            var matches = [];
            for (var i = 2; i < data.length - 1; i++) {
                var c = $(data[i]).find('td');
                var match = {};
                match.date = $(c[0]).text().slice(0, -1);
                match.t1 = {};
                match.t1.name = $(c[2]).find('a').text();
                match.t1.bans = $(c[5]).text().slice(0, -1).split(', ');
                match.t1.picks = $(c[7]).text().slice(0, -1).split(', ');
                match.t1.players = $(c[9]).find('a').map((i, el) => $(el).text()).get();
                match.t2 = {};
                match.t2.name = $(c[3]).find('a').text();
                match.t2.bans = $(c[6]).text().slice(0, -1).split(', ');
                match.t2.picks = $(c[8]).text().slice(0, -1).split(', ');
                match.t2.players = $(c[10]).find('a').map((i, el) => $(el).text()).get();
                match.result = $(c[4]).text().slice(0, -1);
                if (match.result == 'red') {
                    match.result = 0;
                } else if (match.result == 'blue') {
                    match.result = 1;
                } else {
                    throw new Error('Unknown result: ' + match.result);
                }
                matches.push(match);
            }
            return matches;
        }).catch(function(e) {
            console.log(e);
        });
    });

    return Promise.all(k).then(function(arr) {
        return new Promise(function(resolve, reject) {
            fs.writeFile('matches/' + l + t + '.json', JSON.stringify(arr, null, 4), function(e) {
                if (e) {
                    reject(e);
                } else {
                    resolve(e);
                }
            });
        });
    });
}

var c = Promise.resolve();
if (l === 'all') {
    _.forEach(leagues, function(league, l) {
        _.forEach(league.tournaments, function(tourney, t) {
            c = c.then(function() {
                return scrape(l, t);
            });
        });
    });
} else {
    c = scrape(l, t);
}
c.catch(function(e) {
    console.log(e);
});
