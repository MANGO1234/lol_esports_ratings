/*jslint
    node: true, esversion: 6
*/

//node main.js na & node main.js na2 & node main.js eu & node main.js eu2 & node main.js lck & node main.js lck2 & node main.js lpl & node main.js lpl2

var bo2s = [
    [0, 0],
    [0, 1],
    [1, 0],
    [1, 1]
];
var bo3s = [
    [0, 0, 0],
    [0, 0, 1],
    [0, 1, 0],
    [0, 1, 1],
    [1, 0, 0],
    [1, 0, 1],
    [1, 1, 0],
    [1, 1, 1]
];
var bo5s = [
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 1],
    [0, 0, 0, 1, 0],
    [0, 0, 0, 1, 1],
    [0, 0, 1, 0, 0],
    [0, 0, 1, 0, 1],
    [0, 0, 1, 1, 0],
    [0, 0, 1, 1, 1],
    [0, 1, 0, 0, 0],
    [0, 1, 0, 0, 1],
    [0, 1, 0, 1, 0],
    [0, 1, 0, 1, 1],
    [0, 1, 1, 0, 0],
    [0, 1, 1, 0, 1],
    [0, 1, 1, 1, 0],
    [0, 1, 1, 1, 1],
    [1, 0, 0, 0, 0],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 1, 0],
    [1, 0, 0, 1, 1],
    [1, 0, 1, 0, 0],
    [1, 0, 1, 0, 1],
    [1, 0, 1, 1, 0],
    [1, 0, 1, 1, 1],
    [1, 1, 0, 0, 0],
    [1, 1, 0, 0, 1],
    [1, 1, 0, 1, 0],
    [1, 1, 0, 1, 1],
    [1, 1, 1, 0, 0],
    [1, 1, 1, 0, 1],
    [1, 1, 1, 1, 0],
    [1, 1, 1, 1, 1]
];

var league = {
    na: {
        data: 'data\\na_lcs.txt',
        bo: 3,
        out: 'out\\na_lcs.txt'
    },
    na2: {
        data: 'data\\na_lcs_match.txt',
        out: 'out\\na_lcs_match.txt'
    },
    eu: {
        data: 'data\\eu_lcs.txt',
        bo: 2,
        out: 'out\\eu_lcs.txt'
    },
    eu2: {
        data: 'data\\eu_lcs_match.txt',
        out: 'out\\eu_lcs_match.txt'
    },
    lck: {
        data: 'data\\lck.txt',
        bo: 3,
        out: 'out\\lck.txt'
    },
    lck2: {
        data: 'data\\lck_match.txt',
        out: 'out\\lck_match.txt'
    },
    lpl: {
        data: 'data\\lpl.txt',
        bo: 3,
        out: 'out\\lpl.txt'
    },
    lpl2: {
        data: 'data\\lpl_match.txt',
        out: 'out\\lpl_match.txt'
    },
};


var glicko2 = require('glicko2');
var _ = require('lodash');
var printf = require('printf');
var fs = require('fs');

var STANDBY = 0;
var READING_TITLE = 1;
var READING_WEEK = 2;

var state = STANDBY;
var stateData = {};
stateData.week = -1;
stateData.weeks = [];

if (!league[process.argv[2]]) {
    throw new Error('Unknown league');
}

var lineReader = require('readline').createInterface({
    input: require('fs').createReadStream(league[process.argv[2]].data)
});

lineReader.on('line', function(line) {
    if (line.charAt(0) == '#') {} else if (state == STANDBY && line == 'start') {
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
});