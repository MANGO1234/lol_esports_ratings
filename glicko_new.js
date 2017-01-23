var sqlite3 = require('sqlite3');
var _ = require('lodash');
var glicko2 = require('glicko2');
var fs = require('fs');
var printf = require('printf');
var config = require('./matches/leagues.json');
var namesTranslate = require('./matches/names.json');


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

function calculateModel(matches, type) {
    var ranking = new glicko2.Glicko2({
        tau: 0.5,
        rating: 1500,
        rd: 200,
        vol: 0.06
    });

    var players = {};

    function getPlayer(name) {
        shortName = namesTranslate[name] || name;
        if (!players[shortName]) {
            players[shortName] = {
                name: shortName,
                fullName: name,
                player: ranking.makePlayer(),
                history: {}
            };
        }
        return players[shortName].player;
    }

    if (type === 'ALL') {
        ranking.updateRatings(matches.map((match) => [getPlayer(match.t1), getPlayer(match.t2), match.result]));
        return {
            matches: matches,
            ranking: ranking,
            players: players
        };
    } else if (type === 'SINGLE') {
        for (let i = 0; i < matches.length; i++) {
            let match = matches[i];
            ranking.updateRatings([
                [getPlayer(match.t1), getPlayer(match.t2), match.result]
            ]);
        }
        return {
            matches: matches,
            ranking: ranking,
            players: players
        };
    } else {
        var ratingPeriods = [];
        var newPeriod = {
            matches: []
        };
        var lastMatch;
        for (let i = 0; i < matches.length; i++) {
            var match = matches[i];
            if (i === 0) {
                newPeriod.matches.push(match);
                newPeriod.startDate = match.date;
            } else if (new Date(match.date).getTime() - new Date(lastMatch.date).getTime() <= 25 * 60 * 60 * 1000) {
                newPeriod.matches.push(match);
            } else {
                newPeriod.endDate = newPeriod.matches[newPeriod.matches.length - 1].date;
                ratingPeriods.push(newPeriod);
                newPeriod = {
                    matches: [match],
                    startDate: match.date
                };
            }
            lastMatch = match;
        }
        if (newPeriod.matches.length) {
            newPeriod.endDate = newPeriod.matches[newPeriod.matches.length - 1].date;
            ratingPeriods.push(newPeriod);
        }

        for (let i = 0; i < ratingPeriods.length; i++) {
            var period = ratingPeriods[i];
            ranking.updateRatings(period.matches.map((match) => [getPlayer(match.t1), getPlayer(match.t2), match.result]));
            period.ratings = _.mapValues(players, function(player) {
                return {
                    name: player.name,
                    rating: player.player.getRating(),
                    rd: player.player.getRd(),
                    vol: player.player.getVol()
                };
            });
        }

        return {
            matches: matches,
            ranking: ranking,
            players: players,
            ratingPeriods: ratingPeriods
        };
    }
}

var key = process.argv[2];
getMatches(key).then(function(matches) {
    if (process.argv[3] === '0') {
        return calculateModel(matches, 'ALL');
    }
    if (process.argv[3] === '1') {
        return calculateModel(matches, 'SINGLE');
    }
    return calculateModel(matches);
}).then(function(model) {
    var players = model.players;
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
            write(printf('%-8d %-30s %-8.1f %-8.1f %-8.1f %-8.1f %-8.5f', i + 1, v.fullName.substring(0, 30), v.player.getRating(), v.player.getRd() * 2,
                v.player.getRating() - v.player.getRd() * 2, v.player.getRating() + v.player.getRd() * 2, v.player.getVol()));
        });
        write();
        var ratingsA = playersA.map((p) => p.player.getRating());
        write('Mean of Ratings: ' + mean(ratingsA));
        write('SD of Ratings: ' + sd(ratingsA));
        write('Range of Ratings: ' + (playersA[0].player.getRating() - playersA[playersA.length - 1].player.getRating()));
        write();

        if (model.ratingPeriods) {
            write('**** Ratings by Period ****');
            formatS = '%-8s %-12s %-12s ' + _.repeat('%-8s ', playersA.length);
            write(_.spread(_.partial(printf, formatS, 'Period', 'Start', 'End'))(playersA.map((p) => p.name)));
            formatS = '%-8s %-12s %-12s ' + _.repeat('%-8.1f ', playersA.length);
            model.ratingPeriods.forEach(function(period, i) {
                write(_.spread(_.partial(printf, formatS, i + 1, period.startDate, period.endDate))(playersA.map((p) => period.ratings[p.name].rating)));
            });
            write();
        }

        write('**** Estimated Win Rates (BO1) ****');
        formatS = '%-6s' + _.repeat('%-8s ', playersA.length);
        write(_.spread(_.partial(printf, formatS, ''))(playersA.map((p) => p.name)));
        formatS = '%-6s' + _.repeat('%-8.2f ', playersA.length);
        playersA.forEach(function(p1) {
            write(_.spread(_.partial(printf, formatS, p1.name))(playersA.map((p2) => ratingToWinRate(p1, p2) * 100)));
        });
        write();

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