/*jslint
    node: true, esversion: 6, loopfunc: true
*/

//node main.js na & node main.js na2 & node main.js eu & node main.js eu2 & node main.js lck & node main.js lck2 & node main.js lpl & node main.js lpl2

'use strict';

var league = {
    na: {
        data: 'data\\na_lcs.txt',
        bo: 3,
        out: 'out\\na_lcs.txt'
    },
    na2: {
        data: 'data\\na_lcs_match.txt',
        out: 'out\\na_lcs_match.txt'
    },
    eu: {
        data: 'data\\eu_lcs.txt',
        bo: 2,
        out: 'out\\eu_lcs.txt'
    },
    eu2: {
        data: 'data\\eu_lcs_match.txt',
        out: 'out\\eu_lcs_match.txt'
    },
    lck: {
        data: 'data\\lck.txt',
        bo: 3,
        out: 'out\\lck.txt'
    },
    lck2: {
        data: 'data\\lck_match.txt',
        out: 'out\\lck_match.txt'
    },
    lpl: {
        data: 'data\\lpl.txt',
        bo: 3,
        out: 'out\\lpl.txt'
    },
    lpl2: {
        data: 'data\\lpl_match.txt',
        out: 'out\\lpl_match.txt'
    },
};


var glicko2 = require('glicko2');
var _ = require('lodash');
var printf = require('printf');
var fs = require('fs');

var STANDBY = 0;
var READING_TITLE = 1;
var READING_WEEK = 2;

var state = STANDBY;
var stateData = {};
stateData.week = -1;
stateData.weeks = [];

if (!league[process.argv[2]]) {
    throw new Error('Unknown league');
}

var lineReader = require('readline').createInterface({
    input: require('fs').createReadStream(league[process.argv[2]].data)
});

lineReader.on('line', function(line) {
    if (line.charAt(0) == '#') {} else if (state == STANDBY && line == 'start') {
        state = READING_TITLE;
        stateData.week = -1;
    } else if (state == READING_TITLE) {
        state = READING_WEEK;
        stateData.name = line;
    } else if (state == READING_WEEK) {
        if (line == 'end') {
            state = STANDBY;
        } else if (line == 'week') {
            stateData.week++;
        } else if (line != 'week') {
            stateData.weeks[stateData.week] = stateData.weeks[stateData.week] || [];
            var k = line.split(' ');
            stateData.weeks[stateData.week].push({
                player1: k[0],
                player2: k[1],
                result: k[2] === '0' ? 0 : k[2] === '1' ? 1 : k[2] === '0.5' ? 0.5 : 'NA',
            });
        }
    }
});

function getPool(stateData) {
    var ranking = new glicko2.Glicko2({
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

    for (var i = 0; i < stateData.weeks.length; i++) {
        var matches = stateData.weeks[i].map((datum) => {
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
        players: players,
        weeksUsed: weeksUsed
    };
}

function ratingToWinRate(p1, p2) {
    return 1 / (1 + Math.pow(10, (p2.player.getRating() - p1.player.getRating()) / 400));
}

lineReader.on('close', function() {
    var pool = getPool(stateData);
    var players = pool.players;
    var weeksUsed = pool.weeksUsed;

    var playersA = _.values(players);
    playersA.sort(function(v1, v2) {
        return v2.player.getRating() - v1.player.getRating();
    });

    var stream = fs.createWriteStream(league[process.argv[2]].out);
    stream.once('open', function() {
        function write(s) {
            if (s !== undefined && s !== '') {
                stream.write(s);
                console.log(s);
            } else {
                console.log();
            }
            stream.write('\n');
        }

        write('******** ' + stateData.name + ' ********');
        write('**** Current Ratings ****');
        write(printf('%-8s %-8s %-8s %-8s %-8s %-8s', 'Ranking', 'Team', 'Rating', 'RD', 'Min', 'Max'));
        playersA.forEach(function(v, i) {
            write(printf('%-8d %-8s %-8.1f %-8.1f %-8.1f %-8.1f', i + 1, v.name, v.player.getRating(), v.player.getRd() * 2,
                v.player.getRating() - v.player.getRd() * 2, v.player.getRating() + v.player.getRd() * 2));
        });
        write();
        var ratingsA = playersA.map((p) => p.player.getRating());
        write('Mean of Ratings: ' + mean(ratingsA));
        write('SD of Ratings: ' + sd(ratingsA));
        write('Range of Ratings: ' + (playersA[0].player.getRating() - playersA[playersA.length - 1].player.getRating()));
        write();

        write('**** Ratings by Week ****');
        var formatS = '%-6s' + _.repeat('%-8s ', playersA.length);
        write(_.spread(_.partial(printf, formatS, 'Week'))(playersA.map((p) => p.name)));
        formatS = '%-6d' + _.repeat('%-8.1f ', playersA.length);
        var lastRating = {};
        weeksUsed.forEach(function(week) {
            write(_.spread(_.partial(printf, formatS, week + 1))(playersA.map((p) => {
                if (p.history[week]) {
                    lastRating[p.name] = p.history[week].rating;
                    return p.history[week].rating;
                } else {
                    return lastRating[p.name] === undefined ? -1 : lastRating[p.name];
                }
            })));
        });
        write();

        write('**** Estimated Win Rates (BO1) ****');
        formatS = '%-6s' + _.repeat('%-8s ', playersA.length);
        write(_.spread(_.partial(printf, formatS, ''))(playersA.map((p) => p.name)));
        formatS = '%-6s' + _.repeat('%-8.2f ', playersA.length);
        playersA.forEach(function(p1) {
            write(_.spread(_.partial(printf, formatS, p1.name))(playersA.map((p2) => ratingToWinRate(p1, p2) * 100)));
        });
        write();

        write('**** Estimated Odds (B01) ****');
        formatS = '%-6s' + _.repeat('%-8s ', playersA.length);
        write(_.spread(_.partial(printf, formatS, ''))(playersA.map((p) => p.name)));
        formatS = '%-6s' + _.repeat('%-8.4f ', playersA.length);
        playersA.forEach(function(p1) {
            write(_.spread(_.partial(printf, formatS, p1.name))(playersA.map((p2) => 1 / ratingToWinRate(p1, p2))));
        });
        write();

        if (league[process.argv[2]].bo == 2) {
            write('**** Estimated Win Rates (BO2) ****');
            formatS = '%-6s' + _.repeat('%-8s ', playersA.length);
            write(_.spread(_.partial(printf, formatS, ''))(playersA.map((p) => p.name)));
            formatS = '%-6s' + _.repeat('%-8.2f ', playersA.length);
            playersA.forEach(function(p1) {
                write(_.spread(_.partial(printf, formatS, p1.name))(playersA.map((p2) => {
                    var p = ratingToWinRate(p1, p2);
                    return 1 / p / p;
                })));
            });
            write();

            write('**** Estimated Draw Rates (BO2) ****');
            formatS = '%-6s' + _.repeat('%-8s ', playersA.length);
            write(_.spread(_.partial(printf, formatS, ''))(playersA.map((p) => p.name)));
            formatS = '%-6s' + _.repeat('%-8.2f ', playersA.length);
            playersA.forEach(function(p1) {
                write(_.spread(_.partial(printf, formatS, p1.name))(playersA.map((p2) => {
                    var p = ratingToWinRate(p1, p2);
                    return 1 / (1 - p * p - (1 - p) * (1 - p));
                })));
            });

            write('**** Estimated Loss Rates (BO2) ****');
            formatS = '%-6s' + _.repeat('%-8s ', playersA.length);
            write(_.spread(_.partial(printf, formatS, ''))(playersA.map((p) => p.name)));
            formatS = '%-6s' + _.repeat('%-8.2f ', playersA.length);
            playersA.forEach(function(p1) {
                write(_.spread(_.partial(printf, formatS, p1.name))(playersA.map((p2) => {
                    var p = ratingToWinRate(p1, p2);
                    return 1 / (1 - p) / (1 - p);
                })));
            });
            write();
        } else if (league[process.argv[2]].bo === 3) {
            write('**** Estimated Win Rates (BO3) ****');
            formatS = '%-6s' + _.repeat('%-8s ', playersA.length);
            write(_.spread(_.partial(printf, formatS, ''))(playersA.map((p) => p.name)));
            formatS = '%-6s' + _.repeat('%-8.2f ', playersA.length);
            playersA.forEach(function(p1) {
                write(_.spread(_.partial(printf, formatS, p1.name))(playersA.map((p2) => {
                    var p = ratingToWinRate(p1, p2);
                    return p * p * (3 - 2 * p) * 100;
                })));
            });
            write();

            write('**** Estimated Odds (BO3) ****');
            formatS = '%-6s' + _.repeat('%-8s ', playersA.length);
            write(_.spread(_.partial(printf, formatS, ''))(playersA.map((p) => p.name)));
            formatS = '%-6s' + _.repeat('%-8.4f ', playersA.length);
            playersA.forEach(function(p1) {
                write(_.spread(_.partial(printf, formatS, p1.name))(playersA.map((p2) => {
                    var p = ratingToWinRate(p1, p2);
                    p = p * p * (3 - 2 * p);
                    return 1 / p;
                })));
            });
            write();

            write('**** Estimated Odds (BO3, 0 games) ****');
            formatS = '%-6s' + _.repeat('%-8s ', playersA.length);
            write(_.spread(_.partial(printf, formatS, ''))(playersA.map((p) => p.name)));
            formatS = '%-6s' + _.repeat('%-8.4f ', playersA.length);
            playersA.forEach(function(p1) {
                write(_.spread(_.partial(printf, formatS, p1.name))(playersA.map((p2) => {
                    var p = ratingToWinRate(p1, p2);
                    p = (1 - p) * (1 - p);
                    return 1 / p;
                })));
            });
            write();

            write('**** Estimated Odds (BO3, at least 1 game) ****');
            formatS = '%-6s' + _.repeat('%-8s ', playersA.length);
            write(_.spread(_.partial(printf, formatS, ''))(playersA.map((p) => p.name)));
            formatS = '%-6s' + _.repeat('%-8.4f ', playersA.length);
            playersA.forEach(function(p1) {
                write(_.spread(_.partial(printf, formatS, p1.name))(playersA.map((p2) => {
                    var p = ratingToWinRate(p1, p2);
                    p = 1 - (1 - p) * (1 - p);
                    return 1 / p;
                })));
            });
            write();

            write('**** Estimated Odds (BO3, less than 2 games) ****');
            formatS = '%-6s' + _.repeat('%-8s ', playersA.length);
            write(_.spread(_.partial(printf, formatS, ''))(playersA.map((p) => p.name)));
            formatS = '%-6s' + _.repeat('%-8.4f ', playersA.length);
            playersA.forEach(function(p1) {
                write(_.spread(_.partial(printf, formatS, p1.name))(playersA.map((p2) => {
                    var p = ratingToWinRate(p1, p2);
                    p = (1 - p) * (1 - p) + p * p;
                    return 1 / p;
                })));
            });
            write();

            write('**** Estimated Odds (BO3, 3 games) ****');
            formatS = '%-6s' + _.repeat('%-8s ', playersA.length);
            write(_.spread(_.partial(printf, formatS, ''))(playersA.map((p) => p.name)));
            formatS = '%-6s' + _.repeat('%-8.4f ', playersA.length);
            playersA.forEach(function(p1) {
                write(_.spread(_.partial(printf, formatS, p1.name))(playersA.map((p2) => {
                    var p = ratingToWinRate(p1, p2);
                    p = 1 - (1 - p) * (1 - p) - p * p;
                    return 1 / p;
                })));
            });
            write();
        }
    });
});

function mean(arr) {
    var sum = 0;
    for (var i = 0; i < arr.length; i++) {
        sum += arr[i];
    }
    return sum / arr.length;
}

function sd(arr) {
    var m = arguments.length > 1 ? arguments[1] : mean(arr);
    var sum = 0;
    for (var i = 0; i < arr.length; i++) {
        sum += (arr[i] - m) * (arr[i] - m);
    }
    return Math.sqrt(sum / arr.length);
}