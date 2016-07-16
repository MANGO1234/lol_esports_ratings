/*jslint
    node: true, esversion: 6, loopfunc: true
*/

'use strict';

var glicko2 = require('glicko2');
var _ = require('lodash');
var printf = require('printf');
var fs = require('fs');

var STANDBY = 0;
var READING_CAPITAL = 1;
var READING_BET = 2;
var READING_DESC = 3;
var READING_ESTODD = 4;
var READING_BETODD = 5;
var READING_STATUS = 6;
var READING_AMOUNT = 7;

var state = STANDBY;
var stateData = {};
stateData.bets = [];
stateData.todo = [];

var lineReader = require('readline').createInterface({
    input: require('fs').createReadStream(process.argv[2])
});

lineReader.on('line', function(line) {
    if (line.charAt(0) == '#') {} else if (state == STANDBY && line == 'start') {
        state = READING_CAPITAL;
    } else if (state == READING_CAPITAL) {
        stateData.capital = parseInt(line);
        state = READING_BET;
    } else if (state == READING_BET) {
        if (line == 'end') {
            state = STANDBY;
        } else if (line == '-') {
            stateData.currentBet = {};
            state = READING_DESC;
        } else if (line != '-') {
            throw new Error('Unknown state');
        }
    } else if (state == READING_DESC) {
        stateData.currentBet.desc = line;
        state = READING_ESTODD;
    } else if (state == READING_ESTODD) {
        stateData.currentBet.estodd = parseFloat(line);
        state = READING_BETODD;
    } else if (state == READING_BETODD) {
        stateData.currentBet.betodd = parseFloat(line);
        state = READING_STATUS;
    } else if (state == READING_STATUS) {
        stateData.currentBet.status = line;
        if (line == '1') {
            stateData.todo.push(stateData.currentBet);
            state = READING_BET;
        } else {
            state = READING_AMOUNT;
        }
    } else if (state == READING_AMOUNT) {
        stateData.currentBet.amount = parseInt(line);
        stateData.bets.push(stateData.currentBet);
        state = READING_BET;
    }
});

lineReader.on('close', function() {
    var capital = stateData.capital;
    var outgoing = 0;
    stateData.bets.forEach(function(bet) {
        if (bet.status == 'x') {
            outgoing += bet.amount;
            capital -= bet.amount;
        } else if (bet.status == 'w') {
            capital += Math.round(bet.amount * (bet.betodd - 1));
        } else if (bet.status == 'l') {
            capital -= bet.amount;
        }
    });

    var R = process.argv.length < 4 ? 0.5 : parseFloat(process.argv[3]);
    stateData.todo.forEach(function(item) {
        var o1 = parseFloat(item.estodd);
        var o2 = parseFloat(item.betodd) - 1;
        var p = 1 / o1;
        item.k = (p * o2 - 1 + p) / o2;
    });

    stateData.todo.sort(function(a, b) {
        return a.k - b.k;
    });

    console.log('Current Capital: ' + capital);
    console.log('Current Outgoing: ' + outgoing);
    console.log();

    stateData.bets.forEach(function(bet) {
        console.log('**** Bet ****');
        if (bet.status == 'x') {
            console.log('description: ' + bet.desc);
            console.log('outoing:     ' + bet.amount);
        } else if (bet.status == 'w') {
            console.log('description: ' + bet.desc);
            console.log('result:      +' + Math.round(bet.amount * (bet.betodd - 1)));
        } else if (bet.status == 'l') {
            console.log('description: ' + bet.desc);
            console.log('result:      -' + bet.amount);
        } else {
            throw new Error();
        }
    });

    stateData.todo.forEach(function(item) {
        if (capital < 0) {
            return;
        }

        console.log('**** Bet ****');
        console.log('description:            ' + item.desc);
        console.log('k:                      ' + item.k);
        console.log('bet:                    ' + Math.round(capital * item.k));
        console.log('adjusted bet:           ' + Math.round(capital * item.k * R));
        var bet = Math.round(capital * item.k * R / 25) * 25;
        capital -= bet;
        console.log('adjusted bet (rounded): ' + bet);
        console.log('remaining capital:      ' + capital);
        console.log();
    });
});