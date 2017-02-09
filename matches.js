var printf = require('printf');
var s = require('./glicko_shared.js');

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
}).catch(function(err) {
    console.log(err);
});