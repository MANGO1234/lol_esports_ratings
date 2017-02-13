var printf = require('printf');
var s = require('./glicko_shared.js');
var fs = require("fs");

var key = process.argv[2];
s.getMatches(key).then(function(matches) {
    var blueSideWins = 0;
    for (let i = 0; i < matches.length; i++) {
        var match = matches[i];
        if (match.result) {
            blueSideWins++;
        }
        console.log(printf('%-11s %-27s %-5s %-27s', match.date, match.t1, match.result ? "1:0" : "0:1", match.t2));
    }
    console.log("Blue Side Win Rate: " + blueSideWins / matches.length);

    if (process.argv[3]) {
        var model = s.calculateModel(matches);
        var stream = fs.createWriteStream("out/matches.txt");
        for (let i = 0; i < model.ratingPeriods.length; i++) {
            var period = model.ratingPeriods[i];
            var id = 1;
            for (let j = 0; j < period.matches.length; j++) {
                let match = period.matches[j];
                stream.write(printf('%d,%d,%s,%s,%s\n', id, i, match.t1, match.t2, match.result ? "1,0" : "0,1"));
                id++;
            }
        }
        stream.end();
    }
}).catch(function(err) {
    console.log(err);
});