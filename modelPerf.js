var _ = require('lodash');
var glicko2 = require('glicko2');
var fs = require('fs');
var printf = require('printf');
var s = require('./glicko_shared.js');

var ratingToWinRate = s.ratingToWinRate;
var calculateModel = s.calculateModel;

function runModel(scoring, model, matches, n) {
    n = n || 0;
    for (let i = n; i < matches.length - 1; i++) {
        var subset = matches.slice(0, i);
        var match = matches[i + 1];
        var prediction = model({
            matches: subset,
            predict: match
        });
        scoring.addPrediction(match, prediction);
    }
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
    var model = calculateModel(data.matches, "ALL");
    var p1 = model.getPlayer(data.predict.t1);
    var p2 = model.getPlayer(data.predict.t2);
    return ratingToWinRate(p1, p2);
}

function glicko_single(data) {
    var model = calculateModel(data.matches, "SINGLE");
    var p1 = model.getPlayer(data.predict.t1);
    var p2 = model.getPlayer(data.predict.t2);
    return ratingToWinRate(p1, p2);
}

function glicko_week(data) {
    var model = calculateModel(data.matches);
    var p1 = model.getPlayer(data.predict.t1);
    var p2 = model.getPlayer(data.predict.t2);
    return ratingToWinRate(p1, p2);
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

// analysis
Promise.resolve().then(function() {
    return s.getMatches("lck16ar");
}).then(function(matches) {
    console.log("lck");
    var start = Math.round(matches.length / 2);
    console.log(runModel(BrierScore(), coin_flip, matches, start).getScore());
    console.log(runModel(BrierScore(), glicko_all, matches, start).getScore());
    console.log(runModel(BrierScore(), glicko_single, matches, start).getScore());
    console.log(runModel(BrierScore(), glicko_week, matches, start).getScore());
    console.log(runModel(BrierScore(), glicko_week2, matches, start).getScore());
}).catch(function(e) {
    console.log(e);
}).then(function() {
    return s.getMatches("na16br");
}).then(function(matches) {
    console.log("na");
    var start = Math.round(matches.length / 2);
    console.log(runModel(BrierScore(), coin_flip, matches, start).getScore());
    console.log(runModel(BrierScore(), glicko_all, matches, start).getScore());
    console.log(runModel(BrierScore(), glicko_single, matches, start).getScore());
    console.log(runModel(BrierScore(), glicko_week, matches, start).getScore());
    console.log(runModel(BrierScore(), glicko_week2, matches, start).getScore());
}).catch(function(e) {
    console.log(e);
}).then(function() {
    return s.getMatches("eu16br");
}).then(function(matches) {
    console.log("eu");
    var start = Math.round(matches.length / 2);
    console.log(runModel(BrierScore(), coin_flip, matches, start).getScore());
    console.log(runModel(BrierScore(), glicko_all, matches, start).getScore());
    console.log(runModel(BrierScore(), glicko_single, matches, start).getScore());
    console.log(runModel(BrierScore(), glicko_week, matches, start).getScore());
    console.log(runModel(BrierScore(), glicko_week2, matches, start).getScore());
}).catch(function(e) {
    console.log(e);
});