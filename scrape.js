/*jslint
    node: true, esversion: 6, loopfunc: true
*/

'use strict';

var _ = require('lodash');
var printf = require('printf');
var fs = require('fs');
var cheerio = require('cheerio');
var request = require('request');
var rp = require('request-promise');
var leagues = require('./leagues.js');

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
                match.p1 = $(c[2]).find('a').text();
                match.p2 = $(c[3]).find('a').text();
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

    Promise.all(k).then(function(arr) {
        fs.writeFile('data2/' + l + t + '.json', JSON.stringify(arr, null, 4), function(e) {
            if (e) {
                console.log(e);
            }
        });
    });
}

if (l === 'all') {

} else {
    scrape(l, t);
}