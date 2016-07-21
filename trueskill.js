'use strict';

var _ = require('lodash');
var printf = require('printf');
var fs = require('fs');
var cheerio = require('cheerio');
var request = require('request');
var rp = require('request-promise');
var trueskill = require('trueskill');
var jstrueskill = require('com.izaakschroeder.trueskill');
var leagues = require('./matches/leagues.js');

var l = process.argv[2];
var t = process.argv.length > 3 ? process.argv[3] : leagues[l].current;

var data = require('./matches/' + l + t + '.json');

var INITIAL_MU = 25.0;
var INITIAL_SIGMA = INITIAL_MU / 3.0;

function dataToModel(data) {
    var trueSkill = require('com.izaakschroeder.trueskill').create();

    var players = {};

    function getPlayer(name) {
        if (!players[name]) {
            players[name] = {};
            players[name].skill = [INITIAL_MU, INITIAL_SIGMA];
            players[name].name = name;
            players[name].ratings = [];
        }
        return players[name];
    }

    for (var i = 0; i < data.length; i++) {
        for (var j = 0; j < data[i].length; j++) {
            console.log(i, j);
            var t1 = data[i][j].t1.players.map(getPlayer);
            var t2 = data[i][j].t2.players.map(getPlayer);
            if (data[i][j].result == 1) {
                t1.forEach((p) => p.rank = 1);
                t2.forEach((p) => p.rank = 2);
            } else {
                t1.forEach((p) => p.rank = 2);
                t2.forEach((p) => p.rank = 1);
            }
            trueskill.AdjustPlayers(t1.concat(t2));
            t1.concat(t2).forEach(p => console.log(p.skill));
        }
    }

    return {
        data: data,
        players: players,
    };
}
console.log(dataToModel(data));
