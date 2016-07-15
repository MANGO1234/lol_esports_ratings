/*jslint
    node: true, esversion: 6
*/

//mkdir out; { node main.js data/na_lcs.txt; node main.js data/na_lcs_match.txt; node main.js data/eu_lcs.txt; node main.js data/eu_lcs_match.txt; node main.js data/lck.txt; node main.js data/lck_match.txt; node main.js data/lpl.txt; node main.js data/lpl_match.txt; } > out/ratings.txt
//mkdir out; { node main.js data/na_lcs.txt; node main.js data/eu_lcs.txt; node main.js data/lck.txt; node main.js data/lpl.txt; } > out/ratings.txt
//mkdir out; { node main.js data/na_lcs_match.txt; node main.js data/eu_lcs_match.txt; node main.js data/lck_match.txt; node main.js data/lpl_match.txt; } > out/ratings.txt
//mkdir out & node main.js data\na_lcs.txt > out\na_lcs.txt & type out\na_lcs.txt
//mkdir out & node main.js data\na_lcs_match.txt > out\na_lcs_match.txt & type out\na_lcs_match.txt
//mkdir out & node main.js data\eu_lcs.txt > out\eu_lcs.txt & type out\eu_lcs.txt
//mkdir out & node main.js data\eu_lcs_match.txt > out\eu_lcs_match.txt & type out\eu_lcs_match.txt
//mkdir out & node main.js data\lck.txt > out\lck.txt & type out\lck.txt
//mkdir out & node main.js data\lck_match.txt > out\lck_match.txt & type out\lck_match.txt
//mkdir out & node main.js data\lpl.txt > out\lpl.txt & type out\lpl.txt
//mkdir out & node main.js data\lpl_match.txt > out\lpl_match.txt & type out\lpl_match.txt
//mkdir out & node main.js data\na_lcs.txt > out\na_lcs.txt & type out\na_lcs.txt & node main.js data\na_lcs_match.txt > out\na_lcs_match.txt & type out\na_lcs_match.txt & node main.js data\eu_lcs.txt > out\eu_lcs.txt & type out\eu_lcs.txt & node main.js data\eu_lcs_match.txt > out\eu_lcs_match.txt & type out\eu_lcs_match.txt & node main.js data\lck.txt > out\lck.txt & type out\lck.txt & node main.js data\lck_match.txt > out\lck_match.txt & type out\lck_match.txt & node main.js data\lpl.txt > out\lpl.txt & type out\lpl.txt & node main.js data\lpl_match.txt > out\lpl_match.txt & type out\lpl_match.txt

var glicko2 = require('glicko2');
var _ = require('lodash');
var printf = require('printf');

var STANDBY = 0;
var READING_TITLE = 1;
var READING_WEEK = 2;

var state = STANDBY;
var stateData = {};
stateData.week = -1;
stateData.weeks = [];

var lineReader = require('readline').createInterface({
    input: require('fs').createReadStream(process.argv[2])
});

lineReader.on('line', function(line) {
    if (line.charAt(0) == '#') {
    } else if (state == STANDBY && line == 'start') {
        state = READING_TITLE;
        stateData.week = -1;
    } else if (state == READING_TITLE) {
        state = READING_WEEK;
        stateData.name = line;
    } else if (state == READING_WEEK) {
        if (line == 'end') {
            state = STANDBY;
        } else if (line == 'week') {
            stateData.week++;
        } else if (line != 'week') {
            stateData.weeks[stateData.week] = stateData.weeks[stateData.week] || [];
            var k = line.split(' ');
            stateData.weeks[stateData.week].push({
                player1: k[0],
                player2: k[1],
                result: k[2] === '0' ? 0 : k[2] === '1' ? 1 : k[2] === '0.5' ? 0.5 : 'NA',
            });
        }
    }
});


lineReader.on('close', function() {
    var ranking = new glicko2.Glicko2({
        // tau : 'Reasonable choices are between 0.3 and 1.2, though the system should 
        //       be tested to decide which value results in greatest predictive accuracy.' 
        tau: 0.5,
        rating: 1500,
        rd: 200,
        vol: 0.06
    });

    var players = {};
    var weeksUsed = [];

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

    var toMatch = (datum) => {
        return [getPlayer(datum.player1), getPlayer(datum.player2), datum.result];
    };

    var addHistory = function(week, player) {
        player.history[week] = {
            rating: player.player.getRating(),
            rd: player.player.getRd(),
            vol: player.player.getVol()
        };
    };

    for (var i = 0; i < stateData.weeks.length; i++) {
        var matches = stateData.weeks[i].map(toMatch);
        ranking.updateRatings(matches);
        weeksUsed.push(i);
        _.values(players).forEach(_.partial(addHistory, i));
    }

    var playersA = _.values(players);
    playersA.sort(function(v1, v2) {
        return v2.player.getRating() - v1.player.getRating();
    });

    function ratingToWinRate(p1, p2) {
        return 1/(1+Math.pow(10, (p2.player.getRating() - p1.player.getRating)/400));
    }

    console.log('******** ' + stateData.name + ' ********');
    console.log('**** Current Ratings ****');
    console.log(printf('%-8s %-8s %-8s %-8s %-8s %-8s', 'Ranking', 'Team', 'Rating', 'RD', 'Min', 'Max'));
    playersA.forEach(function(v, i) {
        console.log(printf('%-8d %-8s %-8.1f %-8.1f %-8.1f %-8.1f', i + 1, v.name, v.player.getRating(), v.player.getRd() * 2,
            v.player.getRating() - v.player.getRd() * 2, v.player.getRating() + v.player.getRd() * 2));
    });
    console.log();
    var ratingsA = playersA.map((p) => p.player.getRating());
    console.log('Mean of Ratings: ' + mean(ratingsA));
    console.log('SD of Ratings: ' + sd(ratingsA));
    console.log('Range of Ratings: ' + (playersA[0].player.getRating() - playersA[playersA.length - 1].player.getRating()));
    console.log();

    console.log('**** Ratings by Week ****');
    var formatS = '%-6s' + _.repeat('%-8s ', playersA.length);
    console.log(_.spread(_.partial(printf, formatS, 'Week'))(playersA.map((p) => p.name)));
    formatS = '%-6d' + _.repeat('%-8.1f ', playersA.length);
    var lastRating = {};
    weeksUsed.forEach(function(week) {
        console.log(_.spread(_.partial(printf, formatS, week + 1))(playersA.map((p) => {
            if (p.history[week]) {
                lastRating[p.name] = p.history[week].rating;
                return p.history[week].rating;
            } else {
                return lastRating[p.name] === undefined ? -1 : lastRating[p.name];
            }
        })));
    });
    console.log();
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
