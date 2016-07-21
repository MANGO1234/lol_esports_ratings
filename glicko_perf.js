'use strict';

let glicko2 = require('glicko2');
let _ = require('lodash');
let printf = require('printf');
let s = require('./glicko_shared.js');

let ratingToWinRate = s.ratingToWinRate2;

function log2(n) {
    return Math.log(n) / Math.LN2;
}

var R = {
    tau: 0.5,
    rating: 1500,
    rd: 200,
    vol: 0.06
};

s.readData(process.argv[2]).then(function(data) {
    return s.dataToModel(data, R);
}).then(function(model) {
    let players = model.players;
    let weeksUsed = model.weeksUsed;
    let data = model.data;

    let ranking = new glicko2.Glicko2(R);

    function getPlayers(i) {
        return _.mapValues(players, function(v, k) {
            return ranking.makePlayer(v.history[i].rating, v.history[i].rd, v.history[i].vol);
        });
    }

    _.forEach(players, function(p) {
        p.predictions = [];
    });

    var overall = [];

    overall[0] = {
        ngames: 0,
        correct: 0,
        score: 0,
    };
    for (let i = 3; i < data.weeks.length; i++) {
        let ps = getPlayers(i - 1);

        data.weeks[i].map((datum) => {
            let p1 = model.players[datum.player1];
            let p2 = model.players[datum.player2];
            let r1 = ps[datum.player1].getRating();
            let r2 = ps[datum.player2].getRating();
            p1.predictions[0] = p1.predictions[0] ? p1.predictions[0] : {
                ngames: 0,
                correct: 0,
                score: 0,
            };
            p2.predictions[0] = p2.predictions[0] ? p2.predictions[0] : {
                ngames: 0,
                correct: 0,
                score: 0,
            };

            p1.predictions[0].ngames++;
            p2.predictions[0].ngames++;
            overall[0].ngames++;
            if (datum.result === (r1 > r2 ? 1 : 0)) {
                p1.predictions[0].correct++;
                p2.predictions[0].correct++;
                overall[0].correct++;
            }

            let w = ratingToWinRate(ps[datum.player1], ps[datum.player2]);
            if (datum.result === 1) {
                p1.predictions[0].score += 1 + log2(w);
                p2.predictions[0].score += 1 + log2(w);
                overall[0].score += 1 + log2(w);
            } else {
                p1.predictions[0].score += 1 + log2(1 - w);
                p2.predictions[0].score += 1 + log2(1 - w);
                overall[0].score += 1 + log2(1 - w);
            }
        });
    }

    overall[1] = {
        ngames: 0,
        correct: 0,
        score: 0,
    };
    for (let i = 3; i < data.weeks.length; i++) {
        for (let j = 0; j < data.weeks[i].length; j++) {
            let ps = getPlayers(i - 1);
            let result = data.weeks[i].slice(0, j).map((datum) => {
                return [ps[datum.player1], ps[datum.player2], datum.result];
            });
            ranking.updateRatings(result);

            let datum = data.weeks[i][j];
            let p1 = model.players[datum.player1];
            let p2 = model.players[datum.player2];
            let r1 = ps[datum.player1].getRating();
            let r2 = ps[datum.player2].getRating();
            p1.predictions[1] = p1.predictions[1] ? p1.predictions[1] : {
                ngames: 0,
                correct: 0,
                score: 0,
            };
            p2.predictions[1] = p2.predictions[1] ? p2.predictions[1] : {
                ngames: 0,
                correct: 0,
                score: 0,
            };

            p1.predictions[1].ngames++;
            p2.predictions[1].ngames++;
            overall[1].ngames++;
            if (datum.result === (r1 > r2 ? 1 : 0)) {
                p1.predictions[1].correct++;
                p2.predictions[1].correct++;
                overall[1].correct++;
            }

            let w = ratingToWinRate(ps[datum.player1], ps[datum.player2]);
            if (datum.result === 1) {
                p1.predictions[1].score += 1 + log2(w);
                p2.predictions[1].score += 1 + log2(w);
                overall[1].score += 1 + log2(w);
            } else {
                p1.predictions[1].score += 1 + log2(1 - w);
                p2.predictions[1].score += 1 + log2(1 - w);
                overall[1].score += 1 + log2(1 - w);
            }
        }
    }

    overall[2] = {
        ngames: 0,
        correct: 0,
        score: 0,
    };
    ranking = new glicko2.Glicko2({
        tau: 0.5,
        rating: 1500,
        rd: 200,
        vol: 0.06
    });
    let ps = getPlayers(3 - 1);
    for (let i = 3; i < data.weeks.length; i++) {
        let result = data.weeks[i].map((datum) => {
            let p1 = model.players[datum.player1];
            let p2 = model.players[datum.player2];
            let r1 = ps[datum.player1].getRating();
            let r2 = ps[datum.player2].getRating();
            p1.predictions[2] = p1.predictions[2] ? p1.predictions[2] : {
                ngames: 0,
                correct: 0,
                score: 0,
            };
            p2.predictions[2] = p2.predictions[2] ? p2.predictions[2] : {
                ngames: 0,
                correct: 0,
                score: 0,
            };

            p1.predictions[2].ngames++;
            p2.predictions[2].ngames++;
            overall[2].ngames++;
            if (datum.result === (r1 > r2 ? 1 : 0)) {
                p1.predictions[2].correct++;
                p2.predictions[2].correct++;
                overall[2].correct++;
            }

            let w = ratingToWinRate(ps[datum.player1], ps[datum.player2]);
            if (datum.result === 1) {
                p1.predictions[2].score += 1 + log2(w);
                p2.predictions[2].score += 1 + log2(w);
                overall[2].score += 1 + log2(w);
            } else {
                p1.predictions[2].score += 1 + log2(1 - w);
                p2.predictions[2].score += 1 + log2(1 - w);
                overall[2].score += 1 + log2(1 - w);
            }
            ranking.updateRatings([
                [ps[datum.player1], ps[datum.player2], datum.result]
            ]);
            return;
        });
    }


    let playersA = _.values(players);
    playersA.sort(function(v1, v2) {
        return v2.player.getRating() - v1.player.getRating();
    });

    console.log(printf('%-8s %-8s %-8s %-8s %-8s %-8s', 'Ranking', 'Team', 'Rating', 'RD', 'Min', 'Max'));
    playersA.forEach(function(v, i) {
        console.log(printf('%-8d %-8s %-8.1f %-3d %-3d %-8.4f %-8.4f %-3d %-3d %-8.4f %-8.4f', i + 1, v.name, v.player.getRating(),
            v.predictions[0].ngames, v.predictions[0].correct, v.predictions[0].correct / v.predictions[0].ngames * 100, v.predictions[0].score,
            v.predictions[1].ngames, v.predictions[1].correct, v.predictions[1].correct / v.predictions[1].ngames * 100, v.predictions[1].score
        ));
    });
    console.log();

    console.log("Overall");
    console.log("Model 1 # Games: " + overall[0].ngames);
    console.log("Model 1 Correct Predictions: " + overall[0].correct);
    console.log("Model 1 Correct %: " + overall[0].correct / overall[0].ngames * 100);
    console.log("Model 1 Score: " + overall[0].score);

    console.log("Model 2 # Games: " + overall[1].ngames);
    console.log("Model 2 Correct Predictions: " + overall[1].correct);
    console.log("Model 2 Correct %: " + overall[1].correct / overall[1].ngames * 100);
    console.log("Model 2 Score: " + overall[1].score);

    console.log("Model 3 # Games: " + overall[2].ngames);
    console.log("Model 3 Correct Predictions: " + overall[2].correct);
    console.log("Model 3 Correct %: " + overall[2].correct / overall[2].ngames * 100);
    console.log("Model 3 Score: " + overall[2].score);
}).catch(function(e) {
    console.log(e);
});
