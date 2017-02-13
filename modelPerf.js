var _ = require('lodash');
var glicko2 = require('glicko2');
var fs = require('fs');
var printf = require('printf');
var s = require('./glicko_shared.js');
var sDefaults = require('./matches/defaults.json');
var child_process = require('child_process');

var calculateModel = function(a, b) {
    return s.calculateModel(a, b, {
        default: T
    });
};
var BIN_SIZE = 5;
var BIN_NUM = 100 / BIN_SIZE + 1;
var DEVIATION = 500;
var BLUE_SIDE = 20;
var T = {
    tau: 0.5,
    rating: 1500,
    rd: 200,
    vol: 0.06
};

var g = function(variance) {
    return 1 / Math.sqrt(1 + 3 * Math.pow(Math.log(10) / DEVIATION / Math.PI, 2) * variance);
};

var ratingToWinRate = function(p1, p2) {
    return 1 / (1 + Math.pow(10, g(p2.rating.getRd() * p2.rating.getRd()) * (p2.rating.getRating() - p1.rating.getRating() - BLUE_SIDE) / DEVIATION));
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
    if (model.writeFile) {
        var m = s.calculateModel(matches);
        var str = "";
        for (let i = 0; i < m.ratingPeriods.length; i++) {
            var period = m.ratingPeriods[i];
            var id = 1;
            for (let j = 0; j < period.matches.length; j++) {
                let match = period.matches[j];
                str += (printf('%d,%d,%s,%s,%s\n', id, i, match.t1, match.t2, match.result ? "1,0" : "0,1"));
                id++;
            }
        }
        fs.writeFileSync("out/matches.txt", str);
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

function glicko_all(data) {
    var model = calculateModel(data.matches, "ALL", sDefaults);
    var p1 = model.getPlayer(data.predict.t1);
    var p2 = model.getPlayer(data.predict.t2);
    return ratingToWinRate(p1, p2);
}

function glicko_single(data) {
    var model = calculateModel(data.matches, "SINGLE", sDefaults);
    var p1 = model.getPlayer(data.predict.t1);
    var p2 = model.getPlayer(data.predict.t2);
    return ratingToWinRate(p1, p2);
}

function glicko_week(data) {
    var model = calculateModel(data.matches, "", sDefaults);
    var p1 = model.getPlayer(data.predict.t1);
    var p2 = model.getPlayer(data.predict.t2);
    return ratingToWinRate(p1, p2);
}

// doesn't change ratings during the period
function glicko_week2(data) {
    data.matches.push(data.predict);
    var model = calculateModel(data.matches, "", sDefaults);
    var tmp = model.ratingPeriods.map((tmp) => tmp.matches);
    var k = [];
    for (let i = 0; i < tmp.length - 1; i++) {
        k = k.concat(tmp[i]);
    }
    model = calculateModel(k, "", sDefaults);
    var p1 = model.getPlayer(data.predict.t1);
    var p2 = model.getPlayer(data.predict.t2);
    return ratingToWinRate(p1, p2);
}

var gaussian = require("gaussian")(0, 1);

function trueskillThroughTime(data) {
    var lines = child_process.execSync('G:/other/ChessAnalysis/bin/Debug/ChessAnalysis.exe -no-safe -muS 1500 -sigmaS 300 -beta 200 -tauS 60 -muD 0 -sigmaD 0 ./out/matches.txt -N ' + data.matches.length).toString().split("\r\n");
    var i = lines.indexOf("[Result]") + 1;
    var ratings = {};
    while (lines[i] !== "[End]" && i < lines.length) {
        var line = lines[i].split(",");
        ratings[line[1]] = {
            mu: parseFloat(line[2]),
            sigma: parseFloat(line[3])
        };
        i++;
    }
    var p1 = ratings[data.predict.t1] || {
        mu: 1500,
        sigma: 300
    };
    var p2 = ratings[data.predict.t2] || {
        mu: 1500,
        sigma: 300
    };
    var g = function(variance) {
        return 1 / Math.sqrt(1 + 3 * Math.pow(Math.log(10) / DEVIATION / Math.sqrt(2) / Math.PI, 2) * variance);
    };
    var ratingToWinRate = function(p1, p2) {
        return 1 / (1 + Math.pow(10, g(p2.sigma * p2.sigma) * (p2.mu - p1.mu - BLUE_SIDE * Math.sqrt(2)) / DEVIATION / Math.sqrt(2)));
    };
    // function ratingToWinRate(rA, rB) {
    //     var deltaMu = rA.mu - rB.mu + BLUE_SIDE;
    //     var sumSigma = rA.sigma * rA.sigma + rB.sigma * rB.sigma;
    //     var denominator = Math.sqrt(4 * (200 * 200) + sumSigma);
    //     return gaussian.cdf(deltaMu / denominator);
    // }

    // todo proper win rate???
    // console.log(p1.mu - p2.mu, ratingToWinRate(p1, p2));
    return ratingToWinRate(p1, p2);
}
trueskillThroughTime.writeFile = true;

// analysis
function output(league, matches) {
    console.log(league);
    var start = Math.round(matches.length / 2);
    var model = null;
    model = runModel(BrierScore(), glicko_all, matches, start);
    console.log(model.getScore() + "(" + model.n + ")");
    model = runModel(BrierScore(), glicko_week, matches, start);
    console.log(model.getScore() + "(" + model.n + ")");
    model = runModel(BrierScore(), glicko_week2, matches, start);
    console.log(model.getScore() + "(" + model.n + ")");
    // model = runModel(BrierScore(), trueskillThroughTime, matches, start);
    // console.log(model.getScore() + "(" + model.n + ")");
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

function scoreAll(all, fn) {
    all = all.map((matches) => runModel(BrierScore(), fn, matches, Math.min(Math.round(matches.length / 2)), 100));
    var total = 0;
    var totaln = 0;
    for (let i = 0; i < all.length; i++) {
        total += all[i].score;
        totaln += all[i].n;
    }
    return {
        score: total / totaln
    };
}

var getMatches = function(k) {
    return s.getMatchesWithDetails(k).then(s.transformMatches);
};

Promise.all([
    getMatches("lck15ar"),
    getMatches("lck15br"),
    getMatches("lck16ar"),
    getMatches("lpl16ar"),
    getMatches("lck16br"),
    getMatches("na16br"),
    getMatches("eu16br"),
    getMatches("lpl16br"),
    getMatches("lms16br"),
    getMatches("lck17ar"),
    getMatches("na17ar"),
    getMatches("eu17ar"),
    getMatches("lpl17ar")
]).then(function(a) {
    var lck15arM = a[0];
    var lck15brM = a[1];
    var lck16arM = a[2];
    var lpl16arM = a[3];
    var lck16brM = a[4];
    var na16brM = a[5];
    var eu16brM = a[6];
    var lpl16brM = a[7];
    var lms16brM = a[8];
    var lck17arM = a[9];
    var na17arM = a[10];
    var eu17arM = a[11];
    var lpl17arM = a[12];
    var br2016 = [na16brM, eu16brM, lck16brM, lpl16brM, lms16brM];
    var ar2017 = [na17arM, eu17arM, lck17arM, lpl17arM];
    var ch = 0;
    var t = [];
    var todo = [eu17arM];
    var group = sDefaults.eu17ar.A;
    var fn = glicko_week2;
    if (ch === 0) {
        DEVIATION = 400;
        BLUE_SIDE = 60;
        // output("lck15ar", lck15arM);
        // output("lck15br", lck15brM);
        // output("lck16ar", lck16arM);
        // output("lpl16ar", lpl16arM);
        DEVIATION = 470;
        BLUE_SIDE = 20;
        output("na16br", na16brM);
        output("eu16br", eu16brM);
        output("lck16br", lck16brM);
        output("lpl16br", lpl16brM);
        output("lms16br", lms16brM);
        DEVIATION = 470;
        BLUE_SIDE = 100;
        output("na17ar", na17arM);
        output("eu17ar", eu17arM);
        output("lck17ar", lck17arM);
        // output("lpl17ar", lpl17arM);
        outputBins(br2016, glicko_all);
    } else if (ch === 1) {
        DEVIATION = 400;
        for (let i = 0; i < 150; i += 5) {
            let k = {};
            BLUE_SIDE = i;
            k = scoreAll(todo, fn);
            k.blue = i;
            t.push(k);
        }
    } else if (ch === 2) {
        BLUE_SIDE = 100;
        for (let i = 0; i < 300; i += 10) {
            let k = {};
            DEVIATION = 400 + i;
            k = scoreAll(todo, fn);
            k.deviation = 400 + i;
            t.push(k);
        }
    } else if (ch === 3) {
        DEVIATION = 470;
        BLUE_SIDE = 100;
        for (let i = -400; i < 400; i += 10) {
            let k = {};
            group.defaultRating = 1500 + i;
            k = scoreAll(todo, fn);
            k.rating = 1500 + i;
            t.push(k);
        }
    }
    t.sort(function(a, b) {
        return a.score - b.score;
    });
    console.log(t);
}).catch(function(e) {
    console.log(e);
});