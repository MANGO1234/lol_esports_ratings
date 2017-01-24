'use strict';

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

var glicko2 = require('glicko2');
var _ = require('lodash');
var printf = require('printf');
var s = require('./glicko_shared.js');


var ratingToWinRate = s.ratingToWinRate;
var calculateModel;
if (process.argv[3] === '0') {
    calculateModel = _.partialRight(s.calculateModel, 'ALL');
} else if (process.argv[3] === '1') {
    calculateModel = _.partialRight(s.calculateModel, 'SINGLE');
} else {
    calculateModel = s.calculateModel;
}

var key = process.argv[2];
s.getMatches(key).then(calculateModel).then(function(model) {
    var players = model.players;

    var p1 = model.players[process.argv[3]];
    var p2 = model.players[process.argv[4]];
    if (!(p1 && p2)) {
        throw new Error('Unknown players');
    }

    function winLoseCount(a) {
        var upto = (a.length - 1) / 2 + 1;
        var w = 0;
        var l = 0;
        for (var i = 0; w < upto && l < upto; i++) {
            w += a[i];
            l += 1 - a[i];
        }
        return [w, l];
    }

    function wlCountKey(a) {
        var c = winLoseCount(a);
        return 'w' + c[0] + 'x' + c[1];
    }

    function staticP(p, a) {
        var c = 1;
        for (var i = 0; i < a.length; i++) {
            c *= a[i] === 1 ? p : 1 - p;
        }
        return c;
    }

    function dynamicP(a) {
        var data = calculateModel(model.matches);
        var players = data.players;
        var p1 = data.players[process.argv[3]];
        var p2 = data.players[process.argv[4]];
        var c = 1;
        for (var i = 0; i < a.length; i++) {
            var p = ratingToWinRate(p1, p2);
            c *= a[i] === 1 ? p : 1 - p;
            data.ranking.updateRatings([
                [p1.rating, p2.rating, a[i]]
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
        o.bo3.lengths.g2 = results.w2x0 + results.w0x2;
        o.bo3.lengths.g3 = results.w2x1 + results.w1x2;
        o.bo3.lengths.w1 = results.w2x1 + results.w1x2 + results.w0x2;
        o.bo3.lengths.w2 = results.w1x2 + results.w2x1 + results.w2x0;

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
        o.bo5.lengths.g3 = results.w3x0 + results.w0x3;
        o.bo5.lengths.g4 = results.w3x1 + results.w1x3;
        o.bo5.lengths.g5 = results.w3x2 + results.w2x3;

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
    print('bo3 win', odds.staticP.bo3.win, odds.dynamicP.bo3.win);
    print('bo3 lose', odds.staticP.bo3.lose, odds.dynamicP.bo3.lose);
    print('bo3 win 2-0', odds.staticP.bo3.results.w2x0, odds.dynamicP.bo3.results.w2x0);
    print('bo3 win 2-1', odds.staticP.bo3.results.w2x1, odds.dynamicP.bo3.results.w2x1);
    print('bo3 win 1-2', odds.staticP.bo3.results.w1x2, odds.dynamicP.bo3.results.w1x2);
    print('bo3 win 0-2', odds.staticP.bo3.results.w0x2, odds.dynamicP.bo3.results.w0x2);
    print('bo3 win 2-1/1-2/0-2', odds.staticP.bo3.lengths.w1, odds.dynamicP.bo3.lengths.w1);
    print('bo3 win 1-2/2-1/2-0', odds.staticP.bo3.lengths.w2, odds.dynamicP.bo3.lengths.w2);
    print('bo3 last 2 games', odds.staticP.bo3.lengths.g2, odds.dynamicP.bo3.lengths.g2);
    print('bo3 last 3 games', odds.staticP.bo3.lengths.g3, odds.dynamicP.bo3.lengths.g3);
    print('bo5 win', odds.staticP.bo5.win, odds.dynamicP.bo5.win);
    print('bo5 lose', odds.staticP.bo5.lose, odds.dynamicP.bo5.lose);
    print('bo5 win 3-0', odds.staticP.bo5.results.w3x0, odds.dynamicP.bo5.results.w3x0);
    print('bo5 win 3-1', odds.staticP.bo5.results.w3x1, odds.dynamicP.bo5.results.w3x1);
    print('bo5 win 3-2', odds.staticP.bo5.results.w3x2, odds.dynamicP.bo5.results.w3x2);
    print('bo5 win 2-3', odds.staticP.bo5.results.w2x3, odds.dynamicP.bo5.results.w2x3);
    print('bo5 win 1-3', odds.staticP.bo5.results.w1x3, odds.dynamicP.bo5.results.w1x3);
    print('bo5 win 0-3', odds.staticP.bo5.results.w0x3, odds.dynamicP.bo5.results.w0x3);
    print('bo5 last 3 games', odds.staticP.bo5.lengths.g3, odds.dynamicP.bo5.lengths.g3);
    print('bo5 last 4 games', odds.staticP.bo5.lengths.g4, odds.dynamicP.bo5.lengths.g4);
    print('bo5 last 5 games', odds.staticP.bo5.lengths.g5, odds.dynamicP.bo5.lengths.g5);
}).catch(function(e) {
    console.log(e);
});