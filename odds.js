/*jslint
    node: true, esversion: 6, loopfunc: true
*/

//node main.js na & node main.js na2 & node main.js eu & node main.js eu2 & node main.js lck & node main.js lck2 & node main.js lpl & node main.js lpl2

'use strict';

var bo2s = [
    [0, 0],
    [0, 1],
    [1, 0],
    [1, 1]
];
var bo3s = [
    [0, 0, 0],
    [0, 0, 1],
    [0, 1, 0],
    [0, 1, 1],
    [1, 0, 0],
    [1, 0, 1],
    [1, 1, 0],
    [1, 1, 1]
];
var bo5s = [
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 1],
    [0, 0, 0, 1, 0],
    [0, 0, 0, 1, 1],
    [0, 0, 1, 0, 0],
    [0, 0, 1, 0, 1],
    [0, 0, 1, 1, 0],
    [0, 0, 1, 1, 1],
    [0, 1, 0, 0, 0],
    [0, 1, 0, 0, 1],
    [0, 1, 0, 1, 0],
    [0, 1, 0, 1, 1],
    [0, 1, 1, 0, 0],
    [0, 1, 1, 0, 1],
    [0, 1, 1, 1, 0],
    [0, 1, 1, 1, 1],
    [1, 0, 0, 0, 0],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 1, 0],
    [1, 0, 0, 1, 1],
    [1, 0, 1, 0, 0],
    [1, 0, 1, 0, 1],
    [1, 0, 1, 1, 0],
    [1, 0, 1, 1, 1],
    [1, 1, 0, 0, 0],
    [1, 1, 0, 0, 1],
    [1, 1, 0, 1, 0],
    [1, 1, 0, 1, 1],
    [1, 1, 1, 0, 0],
    [1, 1, 1, 0, 1],
    [1, 1, 1, 1, 0],
    [1, 1, 1, 1, 1]
];

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
        ranking: ranking,
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

    var p1 = pool.players[process.argv[3]];
    var p2 = pool.players[process.argv[4]];
    if (!(p1 && p2)) {
        throw new Error('Unknown players');
    }

    // for bo2
    function count(a) {
        var c = 0;
        for (var i = 0; i < a.length; i++) {
            c += a[i];
        }
        return c;
    }

    function winLoseCount(a) {
        var upto = (a.length-1)/2+1;
        var w = 0;
        var l = 0;
        for (var i = 0; w < upto && l < upto; i++) {
            w += a[i];
            l += 1-a[i];
        }
        return [w, l];
    }

    function wlCountKey(a) {
        var c = winLoseCount(a);
        return 'w'+c[0]+'x'+c[1];
    }

    function staticP(p, a) {
        var c = 1;
        for (var i = 0; i < a.length; i++) {
            c *= a[i] === 1 ? p : 1 - p;
        }
        return c;
    }

    function dynamicP(a) {
        var pool = getPool(stateData);
        var players = pool.players;
        var p1 = pool.players[process.argv[3]];
        var p2 = pool.players[process.argv[4]];
        var c = 1;
        for (var i = 0; i < a.length; i++) {
            var p = ratingToWinRate(p1, p2);
            c *= a[i] === 1 ? p : 1 - p;
            pool.ranking.updateRatings([
                [p1.player, p2.player, a[i]]
            ]);
        }
        return c;
    }

    function findOdds(f) {
        var p = ratingToWinRate(p1, p2);
        var o = {};
        o.bo1 = {};
        o.bo1.win = p;
        o.bo1.lose = 1 - o.bo1.win;

        var counts = [0, 0, 0];
        for (let i = 0; i < bo2s.length; i++) {
            counts[count(bo2s[i])] += f(bo2s[i]);
        }
        o.bo2 = {};
        o.bo2.win = counts[2];
        o.bo2.draw = counts[1];
        o.bo2.lose = counts[0];
        o.bo2.notWin = o.lose+o.draw;
        o.bo2.notLose = o.win+o.draw;

        var results = {};
        for (let i = 0; i < bo3s.length; i++) {
            let key = wlCountKey(bo3s[i]);
            results[key] = results[key] === undefined ? 0 : results[key];
            results[key] += f(bo3s[i]);
        }
        o.bo3 = {};
        o.bo3.win = results.w2x0 + results.w2x1;
        o.bo3.lose = 1 - o.bo3.win;
        o.bo3.results = results;
        o.bo3.lengths = {};
        o.bo3.lengths.g2 = results.w2x0+results.w0x2;
        o.bo3.lengths.g3 = results.w2x1+results.w1x2;

        results = {};
        for (let i = 0; i < bo5s.length; i++) {
            let key = wlCountKey(bo5s[i]);
            results[key] = results[key] === undefined ? 0 : results[key];
            results[key] += f(bo5s[i]);
        }
        o.bo5 = {};
        o.bo5.win = results.w3x0 + results.w3x1 + results.w3x2;
        o.bo5.lose = 1 - o.bo5.win;
        o.bo5.results = results;
        o.bo5.lengths = {};
        o.bo5.lengths.g3 = results.w3x0+results.w0x3;
        o.bo5.lengths.g4 = results.w3x1+results.w1x3;
        o.bo5.lengths.g5 = results.w3x2+results.w2x3;

        return o;
    }

    var odds = {
        staticP: findOdds(_.partial(staticP, ratingToWinRate(p1, p2))),
        dynamicP: findOdds(dynamicP),
    };

    function print(t, p, q) {
        console.log(printf('%-20s %-12.4f %-12.4f %-12.2f %-12.2f', t, 1 / p, 1 / q, p * 100, q * 100));
    }
    console.log(printf('%-20s %-12s %-12s %-12s %-12s', 'Type', 'Stat (O)', 'Dyna (O)', 'Stat (%)', 'Dyna (%)'));
    print('bo1 win', odds.staticP.bo1.win, odds.dynamicP.bo1.win);
    print('bo1 lose', odds.staticP.bo1.lose, odds.dynamicP.bo1.lose);
    if (process.argv == 'eu' && process.argv == 'eu2') {
        print('bo2 win', odds.staticP.bo2.win, odds.dynamicP.bo2.win);
        print('bo2 lose', odds.staticP.bo2.lose, odds.dynamicP.bo2.lose);
        print('bo2 draw', odds.staticP.bo2.draw, odds.dynamicP.bo2.draw);
        print('bo2 not win', odds.staticP.bo2.notWin, odds.dynamicP.bo2.notWin);
        print('bo2 not lose', odds.staticP.bo2.notLose, odds.dynamicP.notLose);
    }
    print('bo3 win', odds.staticP.bo3.win, odds.dynamicP.bo3.win);
    print('bo3 lose', odds.staticP.bo3.lose, odds.dynamicP.bo3.lose);
    print('bo3 win 2-0', odds.staticP.bo3.results.w2x0, odds.dynamicP.bo3.results.w2x0);
    print('bo3 win 2-1', odds.staticP.bo3.results.w2x1, odds.dynamicP.bo3.results.w2x1);
    print('bo3 win 1-2', odds.staticP.bo3.results.w1x2, odds.dynamicP.bo3.results.w1x2);
    print('bo3 win 0-2', odds.staticP.bo3.results.w0x2, odds.dynamicP.bo3.results.w0x2);
    print('bo3 last 2 games', odds.staticP.bo3.lengths.g2, odds.dynamicP.bo3.lengths.g2);
    print('bo3 last 3 games', odds.staticP.bo3.lengths.g3, odds.dynamicP.bo3.lengths.g3);
    print('bo5 win', odds.staticP.bo5.win, odds.dynamicP.bo5.win);
    print('bo5 lose', odds.staticP.bo5.lose, odds.dynamicP.bo5.lose);
    print('bo5 win 3-0', odds.staticP.bo5.results.w3x0, odds.dynamicP.bo5.results.w3x0);
    print('bo5 win 3-1', odds.staticP.bo5.results.w3x1, odds.dynamicP.bo5.results.w3x1);
    print('bo5 win 3-2', odds.staticP.bo5.results.w3x2, odds.dynamicP.bo5.results.w3x2);
    print('bo5 win 2-3', odds.staticP.bo5.results.w2x3, odds.dynamicP.bo5.results.w2x3);
    print('bo5 win 1-3', odds.staticP.bo5.results.w1x3, odds.dynamicP.bo5.results.w1x3);
    print('bo5 win 0-3', odds.staticP.bo5.results.w0x3, odds.dynamicP.bo5.results.w0x2);
    print('bo5 last 3 games', odds.staticP.bo5.lengths.g3, odds.dynamicP.bo5.lengths.g3);
    print('bo5 last 4 games', odds.staticP.bo5.lengths.g4, odds.dynamicP.bo5.lengths.g4);
    print('bo5 last 5 games', odds.staticP.bo5.lengths.g5, odds.dynamicP.bo5.lengths.g5);
});