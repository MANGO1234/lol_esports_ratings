import json
import sys

import numpy as np
import trueskill as ts

from data import getLeagues, getGames

with open('matches/leagues.json') as data_file:
    config = json.load(data_file)

ts.setup(mu=1500, sigma=300, beta=200, draw_probability=0)

key = sys.argv[1]
data = getGames(getLeagues(key))
allGames = data.getGames()


def getPlayers(games):
    players = {}
    p = games['t1p1']
    p = np.append(p, games['t1p2'])
    p = np.append(p, games['t1p3'])
    p = np.append(p, games['t1p4'])
    p = np.append(p, games['t1p5'])
    p = np.append(p, games['t2p1'])
    p = np.append(p, games['t2p2'])
    p = np.append(p, games['t2p3'])
    p = np.append(p, games['t2p4'])
    p = np.append(p, games['t2p5'])
    for player in np.unique(p):
        players[player] = {
            'name': player,
            'team': '',
            'wins': 0,
            'losses': 0,
            'games': 0
        }
    for (player, nGames) in games.groupby('t1p1').size().iteritems():
        players[player]['games'] += nGames
    for (player, nGames) in games.groupby('t1p2').size().iteritems():
        players[player]['games'] += nGames
    for (player, nGames) in games.groupby('t1p3').size().iteritems():
        players[player]['games'] += nGames
    for (player, nGames) in games.groupby('t1p4').size().iteritems():
        players[player]['games'] += nGames
    for (player, nGames) in games.groupby('t1p5').size().iteritems():
        players[player]['games'] += nGames
    for (player, nGames) in games.groupby('t2p1').size().iteritems():
        players[player]['games'] += nGames
    for (player, nGames) in games.groupby('t2p2').size().iteritems():
        players[player]['games'] += nGames
    for (player, nGames) in games.groupby('t2p3').size().iteritems():
        players[player]['games'] += nGames
    for (player, nGames) in games.groupby('t2p4').size().iteritems():
        players[player]['games'] += nGames
    for (player, nGames) in games.groupby('t2p5').size().iteritems():
        players[player]['games'] += nGames
    for ((player, result), nGames) in games.groupby(['t1p1', 'result']).size().iteritems():
        players[player]['wins'] += nGames if result == 1 else 0
        players[player]['losses'] += nGames if result == 0 else 0
    for ((player, result), nGames) in games.groupby(['t1p2', 'result']).size().iteritems():
        players[player]['wins'] += nGames if result == 1 else 0
        players[player]['losses'] += nGames if result == 0 else 0
    for ((player, result), nGames) in games.groupby(['t1p3', 'result']).size().iteritems():
        players[player]['wins'] += nGames if result == 1 else 0
        players[player]['losses'] += nGames if result == 0 else 0
    for ((player, result), nGames) in games.groupby(['t1p4', 'result']).size().iteritems():
        players[player]['wins'] += nGames if result == 1 else 0
        players[player]['losses'] += nGames if result == 0 else 0
    for ((player, result), nGames) in games.groupby(['t1p5', 'result']).size().iteritems():
        players[player]['wins'] += nGames if result == 1 else 0
        players[player]['losses'] += nGames if result == 0 else 0
    for ((player, result), nGames) in games.groupby(['t2p1', 'result']).size().iteritems():
        players[player]['wins'] += nGames if result == 0 else 0
        players[player]['losses'] += nGames if result == 1 else 0
    for ((player, result), nGames) in games.groupby(['t2p2', 'result']).size().iteritems():
        players[player]['wins'] += nGames if result == 0 else 0
        players[player]['losses'] += nGames if result == 1 else 0
    for ((player, result), nGames) in games.groupby(['t2p3', 'result']).size().iteritems():
        players[player]['wins'] += nGames if result == 0 else 0
        players[player]['losses'] += nGames if result == 1 else 0
    for ((player, result), nGames) in games.groupby(['t2p4', 'result']).size().iteritems():
        players[player]['wins'] += nGames if result == 0 else 0
        players[player]['losses'] += nGames if result == 1 else 0
    for ((player, result), nGames) in games.groupby(['t2p5', 'result']).size().iteritems():
        players[player]['wins'] += nGames if result == 0 else 0
        players[player]['losses'] += nGames if result == 1 else 0
    for ((player, team), x) in games.groupby(['t1p1', 't1']):
        players[player]['team'] = team
    for ((player, team), x) in games.groupby(['t1p2', 't1']):
        players[player]['team'] = team
    for ((player, team), x) in games.groupby(['t1p3', 't1']):
        players[player]['team'] = team
    for ((player, team), x) in games.groupby(['t1p4', 't1']):
        players[player]['team'] = team
    for ((player, team), x) in games.groupby(['t1p5', 't1']):
        players[player]['team'] = team
    for ((player, team), x) in games.groupby(['t2p1', 't2']):
        players[player]['team'] = team
    for ((player, team), x) in games.groupby(['t2p2', 't2']):
        players[player]['team'] = team
    for ((player, team), x) in games.groupby(['t2p3', 't2']):
        players[player]['team'] = team
    for ((player, team), x) in games.groupby(['t2p4', 't2']):
        players[player]['team'] = team
    for ((player, team), x) in games.groupby(['t2p5', 't2']):
        players[player]['team'] = team
    return players


def applyTrueskill(games, players):
    for player in players:
        players[player]['rating'] = ts.Rating()
    for i in games.index:
        [(players[games.ix[i, 't1p1']]['rating'],
          players[games.ix[i, 't1p2']]['rating'],
          players[games.ix[i, 't1p3']]['rating'],
          players[games.ix[i, 't1p4']]['rating'],
          players[games.ix[i, 't1p5']]['rating']),
         (players[games.ix[i, 't2p1']]['rating'],
          players[games.ix[i, 't2p2']]['rating'],
          players[games.ix[i, 't2p3']]['rating'],
          players[games.ix[i, 't2p4']]['rating'],
          players[games.ix[i, 't2p5']]['rating'])] = ts.rate(
            [(players[games.ix[i, 't1p1']]['rating'],
              players[games.ix[i, 't1p2']]['rating'],
              players[games.ix[i, 't1p3']]['rating'],
              players[games.ix[i, 't1p4']]['rating'],
              players[games.ix[i, 't1p5']]['rating']),
             (players[games.ix[i, 't2p1']]['rating'],
                players[games.ix[i, 't2p2']]['rating'],
                players[games.ix[i, 't2p3']]['rating'],
                players[games.ix[i, 't2p4']]['rating'],
                players[games.ix[i, 't2p5']]['rating'])],
            [1 - games.ix[i, 'result'], games.ix[i, 'result']])


for league, games in allGames.groupby('league'):
    players = getPlayers(games)
    applyTrueskill(games, players)

    print('***** ' + config['tournaments'][league]['title'] + ' *****')
    print('*** Ratings ***')
    print("{:2}  {:15}  {:25}  {:11}  {:6}  {:6}".format("", "Player", "Team", "Games (W/L)", "Rating", "SD"))
    i = 1
    for p in sorted(players.values(), key=lambda x: x["rating"].mu, reverse=True):
        print("{:2d}  {:15.15}  {:25.25}  {:<3d} ({:>2d}/{:>2d})  {:<6.1f}  {:<6.1f}".format(i, p["name"], p["team"], p["games"], p['wins'], p['losses'], p["rating"].mu, p["rating"].sigma))
        i += 1
    print()
    print('*** By Team ***')
    print("{:2}  {:15}  {:25}  {:11}  {:6}  {:6}".format("", "Player", "Team", "Games (W/L)", "Rating", "SD"))
    i = 1
    for p in sorted(players.values(), key=lambda x: [x["team"], -x["rating"].mu]):
        print("{:2d}  {:15.15}  {:25.25}  {:<3d} ({:>2d}/{:>2d})  {:<6.1f}  {:<6.1f}".format(i, p["name"], p["team"], p["games"], p['wins'], p['losses'], p["rating"].mu, p["rating"].sigma))
        i += 1
    print()
