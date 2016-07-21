'use strict';

let glicko2 = require('glicko2');
let _ = require('lodash');
let printf = require('printf');
let s = require('./glicko_shared.js');

let ratingToWinRate = s.ratingToWinRate;

s.readData(process.argv[2]).then(s.dataToModel).then(function(model) {
    let players = model.players;
    let weeksUsed = model.weeksUsed;
    let data = model.data;

    let ranking = new glicko2.Glicko2({
        tau: 0.5,
        rating: 1500,
        rd: 200,
        vol: 0.06
    });

    function getPlayers(i) {
        return _.mapValues(players, function(v, k) {
            return ranking.makePlayer(v.history[i].rating, v.history[i].rd, v.history[i].vol);
        });
    }

    _.forEach(players, function(p) {
        p.predictions = [];
    });

    for (let i = 3; i < data.weeks.length; i++) {
        let ps = getPlayers(i - 1);

        data.weeks[i].map((datum) => {
            let p1 = model.players[datum.player1];
            let p2 = model.players[datum.player2];
            let r1 = ps[datum.player1].getRating();
            let r2 = ps[datum.player2].getRating();
            p1.predictions[0] = p1.predictions[0] ? p1.predictions[0] : {
                ngames: 0,
                correct: 0
            };
            p2.predictions[0] = p2.predictions[0] ? p2.predictions[0] : {
                ngames: 0,
                correct: 0
            };

            p1.predictions[0].ngames++;
            p2.predictions[0].ngames++;
            if (datum.result === (r1 > r2 ? 1 : 0)) {
                p1.predictions[0].correct++;
                p2.predictions[0].correct++;
            }
        });
    }

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
                correct: 0
            };
            p2.predictions[1] = p2.predictions[1] ? p2.predictions[1] : {
                ngames: 0,
                correct: 0
            };

            p1.predictions[1].ngames++;
            p2.predictions[1].ngames++;
            if (datum.result === (r1 > r2 ? 1 : 0)) {
                p1.predictions[1].correct++;
                p2.predictions[1].correct++;
            }
        }
    }

    let playersA = _.values(players);
    playersA.sort(function(v1, v2) {
        return v2.player.getRating() - v1.player.getRating();
    });

    console.log(printf('%-8s %-8s %-8s %-8s %-8s %-8s', 'Ranking', 'Team', 'Rating', 'RD', 'Min', 'Max'));
    playersA.forEach(function(v, i) {
        console.log(printf('%-8d %-8s %-8.1f %-3d %-3d %-8.4f %-3d %-3d %-8.4f', i + 1, v.name, v.player.getRating(),
            v.predictions[0].ngames, v.predictions[0].correct, v.predictions[0].correct / v.predictions[0].ngames * 100,
            v.predictions[1].ngames, v.predictions[1].correct, v.predictions[1].correct / v.predictions[1].ngames * 100
        ));
    });
    console.log();

    console.log("Overall");
    let sum1 = 0;
    let sum2 = 0;
    for (let i = 0; i < playersA.length; i++) {
        sum1 += playersA[i].predictions[0].ngames;
        sum2 += playersA[i].predictions[0].correct;
    }
    console.log("Model 1 # Games: " + sum1);
    console.log("Model 1 Correct Predictions: " + sum2);
    console.log("Model 1 Correct %: " + sum2 / sum1 * 100);

    sum1 = 0;
    sum2 = 0;
    for (let i = 0; i < playersA.length; i++) {
        sum1 += playersA[i].predictions[1].ngames;
        sum2 += playersA[i].predictions[1].correct;
    }
    console.log("Model 2 # Games: " + sum1);
    console.log("Model 2 Correct Predictions: " + sum2);
    console.log("Model 2 Correct %: " + sum2 / sum1 * 100);
}).catch(function(e) {
    console.log(e);
});
