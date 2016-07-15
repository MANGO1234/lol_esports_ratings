
var capital = parseFloat(process.argv[2]);
var r = parseFloat(process.argv[3]);
var j = 1;
for (var i = 4; i < process.argv.length; i+=2) {
    var o1 = parseFloat(process.argv[i]);
    var o2 = parseFloat(process.argv[i+1]);
    o2--;
    var p = 1/o1;
    var k = (p*o2-1+p)/o2;
    console.log('Bet', j);
    console.log('k = ' + k);
    console.log('bet = ' + capital * k);
    console.log('adjusted bet = ' + capital * k * r);
    var bet = Math.round(capital * k * 4)/4;
    capital -= bet;
    console.log('adjusted bet (rounded) = ' + bet);
    console.log('remaining capital: ' + capital);
    console.log();

    if (capital < 0) return;
    j++;
}
