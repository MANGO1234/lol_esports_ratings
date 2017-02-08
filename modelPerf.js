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

s.getMatches("lck16br").then(function(matches) {
    console.log(runModel(BrierScore(), coin_flip, matches, 100).getScore());
    console.log(runModel(BrierScore(), perfect, matches, 100).getScore());
    console.log(runModel(BrierScore(), t1Wins, matches, 100).getScore());
    console.log(runModel(BrierScore(), glicko_all, matches, 100).getScore());
}).catch(function(e) {
    console.log(e);
});