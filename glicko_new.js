var sqlite3 = require('sqlite3');
var config = require('./matches/leagues.json');
var _ = require('lodash');
var glicko2 = require('glicko2');
var fs = require('fs');
var _ = require('lodash');
var printf = require('printf');


function getMatches(key) {
    return new Promise(function(resolve, reject) {
        var teams;
        if (config.tournaments[key]) {
            teams = [key];
        } else if (config.combined[key]) {
            teams = config.combined[key];
        } else if (key === 'all') {
            teams = Object.keys(config.tournaments);
        }

        var db = new sqlite3.Database('./matches/matches.db');
        db.serialize(function() {
            db.all("select * from matches where league in ('" + teams.join("','") + "') order by id", function(err, rows) {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
                db.close();
            });
        });
    });
}

function calculateModel(matches) {
    var ranking = new glicko2.Glicko2({
        tau: 0.5,
        rating: 1500,
        rd: 200,
        vol: 0.06
    });

    var players = {};

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

    // for (let i = 0; i < matches.length; i++) {
    //     var match = matches[i];
    //     ranking.updateRatings([
    //         [getPlayer(match.t1), getPlayer(match.t2), match.result]
    //     ]);
    // }

    ranking.updateRatings(matches.map(function(match) {
        return [getPlayer(match.t1), getPlayer(match.t2), match.result];
    }));

    return {
        matches: matches,
        ranking: ranking,
        players: players
    };
}

var key = process.argv[2];
getMatches(key).then(calculateModel).then(function(model) {
    var players = model.players;
    var weeksUsed = model.weeksUsed;

    var playersA = _.values(players);
    playersA.sort(function(v1, v2) {
        return v2.player.getRating() - v1.player.getRating();
    });

    var stream = fs.createWriteStream('out/' + key + '.txt');

    function write(s) {
        if (s !== undefined && s !== '') {
            stream.write(s);
            console.log(s);
        } else {
            console.log();
        }
        stream.write('\n');
    }

    stream.once('open', function() {
        write('******** ' + model.matches.name + ' ********');
        write('**** Current Ratings ****');
        write(printf('%-8s %-30s %-8s %-8s %-8s %-8s %-8s', 'Ranking', 'Team', 'Rating', 'RD', 'Min', 'Max', 'Vol'));
        playersA.forEach(function(v, i) {
            write(printf('%-8d %-30s %-8.1f %-8.1f %-8.1f %-8.1f %-8.5f', i + 1, v.name, v.player.getRating(), v.player.getRd() * 2,
                v.player.getRating() - v.player.getRd() * 2, v.player.getRating() + v.player.getRd() * 2, v.player.getVol()));
        });
        write();
        var ratingsA = playersA.map((p) => p.player.getRating());
        write('Mean of Ratings: ' + mean(ratingsA));
        write('SD of Ratings: ' + sd(ratingsA));
        write('Range of Ratings: ' + (playersA[0].player.getRating() - playersA[playersA.length - 1].player.getRating()));
        write();

        // write('**** Ratings by Week ****');
        // var formatS = '%-6s' + _.repeat('%-8s ', playersA.length);
        // write(_.spread(_.partial(printf, formatS, 'Week'))(playersA.map((p) => p.name)));
        // formatS = '%-6d' + _.repeat('%-8.1f ', playersA.length);
        // var lastRating = {};
        // weeksUsed.forEach(function(week) {
        //     write(_.spread(_.partial(printf, formatS, week + 1))(playersA.map((p) => {
        //         if (p.history[week]) {
        //             lastRating[p.name] = p.history[week].rating;
        //             return p.history[week].rating;
        //         } else {
        //             return lastRating[p.name] === undefined ? -1 : lastRating[p.name];
        //         }
        //     })));
        // });
        // write();

        write('**** Estimated Win Rates (BO1) ****');
        formatS = '%-30s' + _.repeat('%-30s ', playersA.length);
        write(_.spread(_.partial(printf, formatS, ''))(playersA.map((p) => p.name)));
        formatS = '%-30s' + _.repeat('%-30.2f ', playersA.length);
        playersA.forEach(function(p1) {
            write(_.spread(_.partial(printf, formatS, p1.name))(playersA.map((p2) => ratingToWinRate(p1, p2) * 100)));
        });
        write();

        write('**** Estimated Win Rates (BO3) ****');
        formatS = '%-30s' + _.repeat('%-30s ', playersA.length);
        write(_.spread(_.partial(printf, formatS, ''))(playersA.map((p) => p.name)));
        formatS = '%-30s' + _.repeat('%-30.2f ', playersA.length);
        playersA.forEach(function(p1) {
            write(_.spread(_.partial(printf, formatS, p1.name))(playersA.map((p2) => {
                var p = ratingToWinRate(p1, p2);
                return p * p * (3 - 2 * p) * 100;
            })));
        });
        write();
    });
}).catch(function(err) {
    console.log(err);
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

function ratingToWinRate(p1, p2) {
    return 1 / (1 + Math.pow(10, (p2.player.getRating() - p1.player.getRating()) / 400));
}

function ratingToWinRate2(p1, p2) {
    return 1 / (1 + Math.pow(10, (p2.getRating() - p1.getRating()) / 400));
}