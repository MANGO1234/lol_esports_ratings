'use strict';

var glicko2 = require('glicko2');
var _ = require('lodash');
var printf = require('printf');
var fs = require('fs');
var leagues = require('./data/leagues.js');
var s = require('./glicko.js');

var ratingToWinRate = s.ratingToWinRate;

s.readData(process.argv[2]).then(s.dataToModel).then(function(model) {
    var players = model.players;
    var weeksUsed = model.weeksUsed;

    var playersA = _.values(players);
    playersA.sort(function(v1, v2) {
        return v2.player.getRating() - v1.player.getRating();
    });

    var stream = fs.createWriteStream(leagues[process.argv[2]].out);
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

        write('******** ' + model.data.name + ' ********');
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

        if (leagues[process.argv[2]].bo == 2) {
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
            write();

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
        } else if (leagues[process.argv[2]].bo === 3) {
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
        }

        function score(r, w) {
            if (r == 1) {
                return w - 0.5;
            } else {
                return 0.5 - w;
            }
        }

        model.data.weeks.forEach(function(week) {
            week.forEach(function(match) {
                var p1 = model.players[match.player1];
                var p2 = model.players[match.player2];
                var r1 = model.players[match.player1].player.getRating();
                var r2 = model.players[match.player2].player.getRating();
                p1.w = p1.w === undefined ? 0 : p1.w;
                p2.w = p2.w === undefined ? 0 : p2.w;
                p1.total = p1.total === undefined ? 0 : p1.total;
                p2.total = p2.total === undefined ? 0 : p2.total;
                p1.d1 = p1.d1 === undefined ? 0 : p1.d1;
                p2.d1 = p2.d1 === undefined ? 0 : p2.d1;
                p1.d2 = p1.d2 === undefined ? 0 : p1.d2;
                p2.d2 = p2.d2 === undefined ? 0 : p2.d2;
                if (r1 > r2) {
                    p1.w += match.result;
                    p2.w += match.result;
                } else {
                    p1.w += 1 - match.result;
                    p2.w += 1 - match.result;
                }
                if (match.result == 1) {
                    p1.d1 += score(1, ratingToWinRate(p1, p2));
                    p2.d1 += score(0, ratingToWinRate(p2, p1));
                } else {
                    p1.d1 += score(0, ratingToWinRate(p1, p2));
                    p2.d1 += score(1, ratingToWinRate(p2, p1));
                }
                p1.total++;
                p2.total++;
            });
        });

        write('**** Other ****');
        // write(printf('%-8s %-8s %-8s %-8s %-8s %-8s', 'Ranking', 'Team', 'Rating', 'RD', 'Min', 'Max'));
        playersA.forEach(function(v, i) {
            write(printf('%-8d %-8s %-8.1f %-3d %-3d %-8.4f %-8.4f', i + 1, v.name, v.player.getRating(), v.total, v.w, v.w / v.total,
                v.d1 / v.total));
        });
        write();
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
