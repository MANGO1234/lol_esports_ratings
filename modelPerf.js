var _ = require('lodash');
var glicko2 = require('glicko2');
var fs = require('fs');
var printf = require('printf');
var s = require('./glicko_shared.js');


var calculateModel = s.calculateModel;
var DEVIATION = 460;
var BIN_SIZE = 5;
var BIN_NUM = 100 / BIN_SIZE + 1;
var CORRECTION = 0.0;
var BLUE_SIDE = 30;

var ratingToWinRate = function(p1, p2) {
    return 1 / (1 + Math.pow(10, (p2.rating.getRating() - p1.rating.getRating() - BLUE_SIDE) / DEVIATION));
};

function runModel(scoring, model, matches, n) {
    n = n || 0;
    var bins = [];
    for (let i = 0; i < BIN_NUM; i++) {
        bins[i] = {
            wins: 0,
            expected: 0,
            total: 0
        };
    }
    for (let i = n; i < matches.length - 1; i++) {
        var subset = matches.slice(0, i);
        var match = matches[i + 1];
        var prediction = model({
            matches: subset,
            predict: match
        });
        scoring.addPrediction(match, prediction);
        var k = Math.floor((prediction * 100 + BIN_SIZE / 2) / BIN_SIZE);
        if (match.result) {
            bins[k].wins++;
        }
        bins[k].expected += prediction;
        bins[k].total++;
    }
    scoring.bins = bins;
    return scoring;
}

// scoring
function RMSE() {
    return {
        score: 0,
        n: 0,
        addPrediction: function(match, prediction) {
            this.score += Math.pow(match.result - prediction, 2);
            this.n += 1;
        },
        getScore: function() {
            return Math.sqrt(this.score / this.n);
        }
    };
}

function BrierScore() {
    return {
        score: 0,
        n: 0,
        addPrediction: function(match, prediction) {
            this.score += Math.pow(match.result - prediction, 2);
            this.n += 1;
        },
        getScore: function() {
            return this.score / this.n;
        }
    };
}

function Logarithmic() {
    return {
        score: 0,
        addPrediction: function(match, prediction) {
            this.score += match.result * Math.log(prediction) + (1 - match.result) * Math.log(1 - prediction);
        },
        getScore: function() {
            return this.score;
        }
    };
}

// models
function coin_flip(data) {
    return 0.5;
}

function perfect(data) {
    return data.predict.result;
}

function t1Wins(data) {
    return 1;
}

function correctBlueSide(r) {
    return r + (1 - r) * CORRECTION;
}

function glicko_all(data) {
    var model = calculateModel(data.matches, "ALL");
    var p1 = model.getPlayer(data.predict.t1);
    var p2 = model.getPlayer(data.predict.t2);
    return ratingToWinRate(p1, p2);
}

function glicko_all_corrected(data) {
    return correctBlueSide(glicko_all(data));
}

function glicko_single(data) {
    var model = calculateModel(data.matches, "SINGLE");
    var p1 = model.getPlayer(data.predict.t1);
    var p2 = model.getPlayer(data.predict.t2);
    return ratingToWinRate(p1, p2);
}

function glicko_single_corrected(data) {
    return correctBlueSide(glicko_single(data));
}


function glicko_week(data) {
    var model = calculateModel(data.matches);
    var p1 = model.getPlayer(data.predict.t1);
    var p2 = model.getPlayer(data.predict.t2);
    return ratingToWinRate(p1, p2);
}

function glicko_week_corrected(data) {
    return correctBlueSide(glicko_week(data));
}

// doesn't change ratings during the period
function glicko_week2(data) {
    data.matches.push(data.predict);
    var model = calculateModel(data.matches);
    var tmp = model.ratingPeriods.map((tmp) => tmp.matches);
    var k = [];
    for (let i = 0; i < tmp.length - 1; i++) {
        k = k.concat(tmp[i]);
    }
    model = calculateModel(k);
    var p1 = model.getPlayer(data.predict.t1);
    var p2 = model.getPlayer(data.predict.t2);
    return ratingToWinRate(p1, p2);
}

function glicko_week2_corrected(data) {
    return correctBlueSide(glicko_week2(data));
}

// analysis
function output(league, matches) {
    console.log(league);
    var start = Math.round(matches.length / 2);
    var model = null;
    var header = [];
    for (let i = 0; i < BIN_NUM; i++) {
        header.push(i * BIN_SIZE);
    }

    model = runModel(BrierScore(), coin_flip, matches, start);
    console.log(model.getScore());
    model = runModel(BrierScore(), glicko_all_corrected, matches, start);
    console.log(model.getScore());
    model = runModel(BrierScore(), glicko_all, matches, start);
    console.log(model.getScore());
    // console.log(_.partial(printf, _.repeat("%-5d ", BIN_NUM)).apply(null, header));
    // console.log(_.partial(printf, _.repeat("%-5.1f ", BIN_NUM)).apply(null, model.bins.map((a) => a.total ? 100 * a.wins / a.total : -1)));
    model = runModel(BrierScore(), glicko_single_corrected, matches, start);
    console.log(model.getScore());
    model = runModel(BrierScore(), glicko_single, matches, start);
    console.log(model.getScore());
    // console.log(_.partial(printf, _.repeat("%-5d ", BIN_NUM)).apply(null, header));
    // console.log(_.partial(printf, _.repeat("%-5.1f ", BIN_NUM)).apply(null, model.bins.map((a) => a.total ? 100 * a.wins / a.total : -1)));
    model = runModel(BrierScore(), glicko_week_corrected, matches, start);
    console.log(model.getScore());
    model = runModel(BrierScore(), glicko_week, matches, start);
    console.log(model.getScore());
    // console.log(_.partial(printf, _.repeat("%-5d ", BIN_NUM)).apply(null, header));
    // console.log(_.partial(printf, _.repeat("%-5.1f ", BIN_NUM)).apply(null, model.bins.map((a) => a.total ? 100 * a.wins / a.total : -1)));
    model = runModel(BrierScore(), glicko_week2_corrected, matches, start);
    console.log(model.getScore());
    model = runModel(BrierScore(), glicko_week2, matches, start);
    console.log(model.getScore());
    // console.log(_.partial(printf, _.repeat("%-5d ", BIN_NUM)).apply(null, header));
    // console.log(_.partial(printf, _.repeat("%-5.1f ", BIN_NUM)).apply(null, model.bins.map((a) => a.total ? 100 * a.wins / a.total : -1)));
    console.log();
}

function outputBins(all, fn) {
    all = all.map((matches) => runModel(BrierScore(), fn, matches, Math.min(Math.round(matches.length / 2)), 80));
    var header = [];
    var bins = [];
    for (let i = 0; i < BIN_NUM; i++) {
        header.push(i * BIN_SIZE);
        bins[i] = {
            wins: 0,
            expected: 0,
            total: 0
        };
    }
    for (let i = 0; i < all.length; i++) {
        var league = all[i];
        for (let i = 0; i < BIN_NUM; i++) {
            bins[i].wins += league.bins[i].wins;
            bins[i].expected += league.bins[i].expected;
            bins[i].total += league.bins[i].total;
        }
    }
    console.log(_.partial(printf, "Bin        " + _.repeat("%-5d ", BIN_NUM)).apply(null, header));
    console.log(_.partial(printf, "Games      " + _.repeat("%-5d ", BIN_NUM)).apply(null, bins.map((a) => a.total)));
    console.log(_.partial(printf, "Expected   " + _.repeat("%-5.1f ", BIN_NUM)).apply(null, bins.map((a) => a.total ? 100 * a.expected / a.total : -1)));
    console.log(_.partial(printf, "Actual     " + _.repeat("%-5.1f ", BIN_NUM)).apply(null, bins.map((a) => a.total ? 100 * a.wins / a.total : -1)));
    console.log(_.partial(printf, "Expected 2 " + _.repeat("%-5.1f ", BIN_NUM)).apply(null, bins.map((a) => a.expected)));
    console.log(_.partial(printf, "Actual 2   " + _.repeat("%-5.1f ", BIN_NUM)).apply(null, bins.map((a) => a.wins)));
}

function scoreBin(all, fn, rwr, binSize) {
    DEVIATION = rwr;
    BIN_SIZE = binSize;
    BIN_NUM = 100 / BIN_SIZE + 1;
    all = all.map((matches) => runModel(BrierScore(), fn, matches, Math.min(Math.round(matches.length / 2)), 100));
    var header = [];
    var bins = [];
    for (let i = 0; i < BIN_NUM; i++) {
        header.push(i * BIN_SIZE);
        bins[i] = {
            wins: 0,
            expected: 0,
            total: 0
        };
    }
    for (let i = 0; i < all.length; i++) {
        var league = all[i];
        for (let i = 0; i < BIN_NUM; i++) {
            bins[i].wins += league.bins[i].wins;
            bins[i].expected += league.bins[i].expected;
            bins[i].total += league.bins[i].total;
        }
    }
    var sum = 0;
    var k = 0;
    for (let i = 0; i < bins.length; i++) {
        var bin = bins[i];
        if (bin.total !== 0) {
            sum += (bin.wins - bin.expected) * (bin.wins - bin.expected);
            k++;
        }
    }
    return {
        score: sum / k,
        n: k
    };
}

function scoreAll(all, fn) {
    all = all.map((matches) => runModel(BrierScore(), fn, matches, Math.min(Math.round(matches.length / 2)), 100));
    var header = [];
    var bins = [];
    var total = 0;
    for (let i = 0; i < all.length; i++) {
        var league = all[i];
        total += league.getScore();
    }
    return {
        score: total
    };
}


Promise.all([
    s.getMatches("lck15ar"),
    s.getMatches("lck15br"),
    s.getMatches("lck16ar"),
    s.getMatches("lck16br"),
    s.getMatches("na16br"),
    s.getMatches("eu16br"),
    s.getMatches("lpl16br"),
    s.getMatches("lms16br"),
    s.getMatches("lck17ar"),
    s.getMatches("na17ar"),
    s.getMatches("eu17ar"),
    s.getMatches("lpl17ar")
]).then(function(a) {
    var lck15arM = a[0];
    var lck15brM = a[1];
    var lck16arM = a[2];
    var lck16brM = a[3];
    var na16brM = a[4];
    var eu16brM = a[5];
    var lpl16brM = a[6];
    var lms16brM = a[7];
    var lck17arM = a[8];
    var na17arM = a[9];
    var eu17arM = a[10];
    var lpl17arM = a[11];
    DEVIATION = 400;
    BLUE_SIDE = 10;
    output("lpl", eu16brM);
    output("lms", lms16brM);
    output("lck", lck16brM);
    output("na", na16brM);
    output("eu", eu16brM);
    outputBins(a.slice(3, 8), glicko_all);
    var t = [];
    for (let i = 0; i < 150; i += 5) {
        for (let j = 0; j < 100; j += 10) {
            BLUE_SIDE = i;
            DEVIATION = 400 + j;
            let k = {};
            k = scoreAll(a.slice(8, 12), glicko_all);
            k.blue = i;
            k.dev = 400 + j;
            t.push(k);
        }
    }
    t.sort(function(a, b) {
        return a.score - b.score;
    });
    console.log(t);
    console.log(1 / (1 + Math.pow(10, (-100) / DEVIATION)));
}).catch(function(e) {
    console.log(e);
});