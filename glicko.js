var _ = require('lodash');
var glicko2 = require('glicko2');
var fs = require('fs');
var printf = require('printf');
var s = require('./glicko_shared.js');

var ratingToWinRate = s.ratingToWinRate;
var calculateModel;
if (process.argv[3] === '0') {
    calculateModel = _.partialRight(s.calculateModel, 'ALL');
} else if (process.argv[3] === '1') {
    calculateModel = _.partialRight(s.calculateModel, 'SINGLE');
} else {
    calculateModel = s.calculateModel;
}

var key = process.argv[2];
s.getMatches(key).then(calculateModel).then(function(model) {
    var players = model.players;
    var playersA = _.values(players);
    playersA.sort(function(v1, v2) {
        return v2.rating.getRating() - v1.rating.getRating();
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
        write('**** Current Ratings ****');
        write(printf('%-8s %-30s %-8s %-8s %-8s %-8s %-8s', 'Ranking', 'Team', 'Rating', 'RD', 'Min', 'Max', 'Vol'));
        playersA.forEach(function(v, i) {
            write(printf('%-8d %-30s %-8.1f %-8.1f %-8.1f %-8.1f %-8.5f', i + 1, v.fullName.substring(0, 30), v.rating.getRating(), v.rating.getRd() * 2,
                v.rating.getRating() - v.rating.getRd() * 2, v.rating.getRating() + v.rating.getRd() * 2, v.rating.getVol()));
        });
        write();
        var ratingsA = playersA.map((p) => p.rating.getRating());
        write('Mean of Ratings: ' + mean(ratingsA));
        write('SD of Ratings: ' + sd(ratingsA));
        write('Range of Ratings: ' + (playersA[0].rating.getRating() - playersA[playersA.length - 1].rating.getRating()));
        write();

        if (model.ratingPeriods) {
            write('**** Ratings by Period ****');
            formatS = '%-8s %-12s %-12s ' + _.repeat('%-8s ', playersA.length);
            write(_.spread(_.partial(printf, formatS, 'Period', 'Start', 'End'))(playersA.map((p) => p.name)));
            formatS = '%-8s %-12s %-12s ' + _.repeat('%-8.1f ', playersA.length);
            model.ratingPeriods.forEach(function(period, i) {
                write(_.spread(_.partial(printf, formatS, i + 1, period.startDate, period.endDate))(playersA.map((p) => {
                    return (period.ratings[p.name] && period.ratings[p.name].rating) || 1500;
                })));
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