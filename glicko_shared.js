var _ = require('lodash');
var glicko2 = require('glicko2');
var printf = require('printf');
var fs = require('fs');
var cheerio = require('cheerio');
var request = require('request');
var rp = require('request-promise');
var leagues = require('./data/leagues.js');

function readData(league) {
    return new Promise(function(resolve, reject) {
        if (!league) {
            throw new Error('Unknown leagues');
        }

        var STANDBY = 0;
        var READING_TITLE = 1;
        var READING_WEEK = 2;

        var state = STANDBY;
        var data = {};
        data.week = -1;
        data.weeks = [];

        var lineReader = require('readline').createInterface({
            input: require('fs').createReadStream(leagues[league].data)
        });

        lineReader.on('line', function(line) {
            if (line.charAt(0) == '#') {} else if (state == STANDBY && line == 'start') {
                state = READING_TITLE;
                data.week = -1;
            } else if (state == READING_TITLE) {
                state = READING_WEEK;
                data.name = line;
            } else if (state == READING_WEEK) {
                if (line == 'end') {
                    state = STANDBY;
                } else if (line == 'week') {
                    data.week++;
                } else if (line != 'week') {
                    data.weeks[data.week] = data.weeks[data.week] || [];
                    var k = line.split(' ');
                    data.weeks[data.week].push({
                        player1: k[0],
                        player2: k[1],
                        result: k[2] === '0' ? 0 : k[2] === '1' ? 1 : k[2] === '0.5' ? 0.5 : 'NA',
                    });
                }
            }
        });

        lineReader.on('close', function() {
            resolve(data);
        });
    });
}

function dataToModel(data, params) {
    var ranking = new glicko2.Glicko2(params || {
        tau: 0.5,
        rating: 1500,
        rd: 200,
        vol: 0.06
    });

    var players = {};
    var weeksUsed = [];

    function getPlayer(name) {
        if (!players[name]) {
            players[name] = {
                name: name,
                player: ranking.makePlayer(),
                history: {}
            };
        }
        return players[name].player;
    }

    for (var i = 0; i < data.weeks.length; i++) {
        var matches = data.weeks[i].map((datum) => {
            return [getPlayer(datum.player1), getPlayer(datum.player2), datum.result];
        });
        ranking.updateRatings(matches);
        weeksUsed.push(i);
        _.values(players).forEach((player) => {
            player.history[i] = {
                rating: player.player.getRating(),
                rd: player.player.getRd(),
                vol: player.player.getVol()
            };
        });
    }

    return {
        data: data,
        ranking: ranking,
        players: players,
        weeksUsed: weeksUsed
    };
}

function ratingToWinRate(p1, p2) {
    return 1 / (1 + Math.pow(10, (p2.player.getRating() - p1.player.getRating()) / 400));
}

function ratingToWinRate2(p1, p2) {
    return 1 / (1 + Math.pow(10, (p2.getRating() - p1.getRating()) / 400));
}

module.exports = {
    readData: readData,
    dataToModel: dataToModel,
    ratingToWinRate: ratingToWinRate,
    ratingToWinRate2: ratingToWinRate2
};
