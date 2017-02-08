var sqlite3 = require('sqlite3');
var namesTranslate = require('./matches/names.json');
var _ = require('lodash');
var glicko2 = require('glicko2');
var printf = require('printf');
var config = require('./matches/leagues.json');

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
            db.all("select * from matches where league in ('" + teams.join("','") + "') order by date,id", function(err, rows) {
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
                rating: ranking.makePlayer(),
                history: {}
            };
        }
        return players[shortName];
    }

    if (type === 'ALL') {
        ranking.updateRatings(matches.map((match) => [getPlayer(match.t1).rating, getPlayer(match.t2).rating, match.result]));
        return {
            matches: matches,
            ranking: ranking,
            players: players,
            getPlayer: getPlayer
        };
    } else if (type === 'SINGLE') {
        for (let i = 0; i < matches.length; i++) {
            let match = matches[i];
            ranking.updateRatings([
                [getPlayer(match.t1).rating, getPlayer(match.t2).rating, match.result]
            ]);
        }
        return {
            matches: matches,
            ranking: ranking,
            players: players,
            getPlayer: getPlayer
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
                // fix: sometimes the days in the week is not consecutive
            } else if (match.league === "lck17ar" && match.date === "2017-01-21") {
                newPeriod.matches.push(match);
            } else if (match.league === "lck17ar" && match.date === "2017-02-04") {
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
            ranking.updateRatings(period.matches.map((match) => [getPlayer(match.t1).rating, getPlayer(match.t2).rating, match.result]));
            period.ratings = _.mapValues(players, function(player) {
                return {
                    name: player.name,
                    rating: player.rating.getRating(),
                    rd: player.rating.getRd(),
                    vol: player.rating.getVol()
                };
            });
        }

        return {
            matches: matches,
            ranking: ranking,
            players: players,
            ratingPeriods: ratingPeriods,
            getPlayer: getPlayer
        };
    }
}

function ratingToWinRate(p1, p2) {
    return 1 / (1 + Math.pow(10, (p2.rating.getRating() - p1.rating.getRating()) / 400));
}

function ratingToWinRate2(p1, p2) {
    return 1 / (1 + Math.pow(10, (p2.getRating() - p1.getRating()) / 400));
}

module.exports = {
    getMatches: getMatches,
    calculateModel: calculateModel,
    ratingToWinRate: ratingToWinRate,
    ratingToWinRate2: ratingToWinRate2
};