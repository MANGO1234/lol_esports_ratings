var sqlite3 = require('sqlite3');
var namesTranslate = require('./matches/names.json');
var _ = require('lodash');
var glicko2 = require('glicko2');
var printf = require('printf');
var config = require('./matches/leagues.json');
var sDefaults = require('./matches/defaults.json');

function getLeagues(key) {
    if (config.tournaments[key]) {
        return [key];
    } else if (config.combined[key]) {
        return config.combined[key];
    } else if (key === 'all') {
        return Object.keys(config.tournaments);
    }
}

function getMatches(key) {
    return new Promise(function(resolve, reject) {
        var leagues = getLeagues(key);
        var db = new sqlite3.Database('./matches/matches.db');
        db.serialize(function() {
            db.all("select * from matches where league in ('" + leagues.join("','") + "') order by date,id", function(err, rows) {
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

function getMatchesWithDetails(key) {
    return new Promise(function(resolve, reject) {
        var leagues = getLeagues(key);
        var db = new sqlite3.Database('./matches/matches.db');
        db.serialize(function() {
            db.all("select * from matches m left natural join details d where m.league in ('" + leagues.join("','") + "') order by m.date,m.id", function(err, rows) {
                if (err) {
                    reject(err);
                } else {
                    for (let i = 0; i < rows.length; i++) {
                        var row = rows[i];
                        row.data = JSON.parse(row.data || "{}");
                    }
                    resolve(rows);
                }
                db.close();
            });
        });
    });
}

function transformMatches(matches) {
    for (let i = 0; i < matches.length; i++) {
        var match = matches[i];
        // if (match.data.teams) {
        //     let t1 = match.data.teams[0].teamId;
        //     let t2 = match.data.teams[1].teamId;
        //     let t1kills = 0;
        //     let t2kills = 0;
        //     for (let i = 0; i < match.data.participants.length; i++) {
        //         var p = match.data.participants[i];
        //         if (p.teamId === t1) {
        //             t1kills += p.stats.kills;
        //         } else {
        //             t2kills += p.stats.kills;
        //         }
        //     }
        // }
    }
    return matches;
}

function calculateModel(matches, type, options) {
    options = options || {};
    var seasonDefaults = options.seasonDefaults || sDefaults;
    var ranking = new glicko2.Glicko2(options.default || {
        tau: 0.5,
        rating: 1500,
        rd: 200,
        vol: 0.06
    });

    var players = {};

    function getPlayer(name, league) {
        shortName = namesTranslate[name] || name;
        if (!players[shortName]) {
            var rating = ranking.makePlayer();
            if (seasonDefaults[league]) {
                if (seasonDefaults[league].A.teams.indexOf(shortName) > -1) {
                    rating = ranking.makePlayer(seasonDefaults[league].A.defaultRating);
                } else if (seasonDefaults[league].B.teams.indexOf(shortName) > -1) {
                    rating = ranking.makePlayer(seasonDefaults[league].B.defaultRating);
                } else {
                    throw new Error(league + " has no default rating for " + shortName);
                }
            }
            players[shortName] = {
                name: shortName,
                fullName: name,
                rating: rating,
                history: {}
            };
        }
        return players[shortName];
    }

    if (type === 'ALL') {
        ranking.updateRatings(matches.map((match) => [getPlayer(match.t1, match.league).rating, getPlayer(match.t2, match.league).rating, match.result]));
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
                [getPlayer(match.t1, match.league).rating, getPlayer(match.t2, match.league).rating, match.result]
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
            } else if (match.league === "lck15ar" && match.date === "2015-01-09") {
                newPeriod.matches.push(match);
            } else if (match.league === "lck15ar" && match.date === "2015-01-16") {
                newPeriod.matches.push(match);
            } else if (match.league === "lck15ar" && match.date === "2015-01-23") {
                newPeriod.matches.push(match);
            } else if (match.league === "lck15ar" && match.date === "2015-01-30") {
                newPeriod.matches.push(match);
            } else if (match.league === "lck15ar" && match.date === "2015-02-06") {
                newPeriod.matches.push(match);
            } else if (match.league === "lck15ar" && match.date === "2015-02-13") {
                newPeriod.matches.push(match);
            } else if (match.league === "lck15ar" && match.date === "2015-02-27") {
                newPeriod.matches.push(match);
            } else if (match.league === "lck15ar" && match.date === "2015-03-06") {
                newPeriod.matches.push(match);
            } else if (match.league === "lck15ar" && match.date === "2015-03-20") {
                newPeriod.matches.push(match);
            } else if (match.league === "lck15ar" && match.date === "2015-03-27") {
                newPeriod.matches.push(match);
            } else if (match.league === "lck15ar" && match.date === "2015-04-03") {
                newPeriod.matches.push(match);
            } else if (match.league === "lck15ar" && match.date === "2015-04-10") {
                newPeriod.matches.push(match);
            } else if (match.league === "lck15br" && match.date === "2015-06-05") {
                newPeriod.matches.push(match);
            } else if (match.league === "lck15br" && match.date === "2015-06-07") {
                newPeriod.matches.push(match);
            } else if (match.league === "lck15br" && match.date === "2015-06-19") {
                newPeriod.matches.push(match);
            } else if (match.league === "lck15br" && match.date === "2015-07-24") {
                newPeriod.matches.push(match);
            } else if (match.league === "lck17ar" && match.date === "2017-01-21") {
                newPeriod.matches.push(match);
            } else if (match.league === "lck17ar" && match.date === "2017-02-04") {
                newPeriod.matches.push(match);
            } else if (match.league === "lck17ar" && match.date === "2017-02-11") {
                newPeriod.matches.push(match);
            } else if (match.league === "lck17ar" && match.date === "2017-02-18") {
                newPeriod.matches.push(match);
            } else if (match.league === "lck17ar" && match.date === "2017-03-04") {
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
            ranking.updateRatings(period.matches.map((match) => [getPlayer(match.t1, match.league).rating, getPlayer(match.t2, match.league).rating, match.result]));
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

// controversial? 500 fits a lot better
var BETA = 400;

var g = function(variance) {
    return 1 / Math.sqrt(1 + 3 * Math.pow(Math.log(10) / BETA / Math.PI, 2) * variance);
};

function ratingToWinRate(p1, p2) {
    return 1 / (1 + Math.pow(10, g(p1.rating.getRd() * p1.rating.getRd() + p2.rating.getRd() * p2.rating.getRd()) * (p2.rating.getRating() - p1.rating.getRating()) / BETA));
}

function ratingToWinRate2(p1, p2) {
    return 1 / (1 + Math.pow(10, (p2.getRating() - p1.getRating()) / BETA));
}

module.exports = {
    getLeagues: getLeagues,
    getMatches: getMatches,
    getMatchesWithDetails: getMatchesWithDetails,
    transformMatches: transformMatches,
    calculateModel: calculateModel,
    ratingToWinRate: ratingToWinRate,
    g: g,
    ratingToWinRate2: ratingToWinRate2
};