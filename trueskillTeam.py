import json
import math
import sys

import numpy as np
import trueskill as ts

from data import getLeagues, getGames

with open('matches/leagues.json') as data_file:
    config = json.load(data_file)
with open('matches/names.json') as data_file:
    namesTranslate = json.load(data_file)

ts.setup(mu=1500, sigma=300, beta=200, draw_probability=0)

key = sys.argv[1]
data = getGames(getLeagues(key))
allGames = data.getGames()


def getTeams(games):
    teams = {}
    for team in np.unique(np.append(games['t1'], games['t2'])):
        teams[team] = {
            'name': team,
            'shortName': namesTranslate[team],
            'wins': 0,
            'losses': 0,
            'games': 0
        }
    for (team, nGames) in games.groupby('t1').size().iteritems():
        teams[team]['games'] += nGames
    for (team, nGames) in games.groupby('t2').size().iteritems():
        teams[team]['games'] += nGames
    for ((team, result), nGames) in games.groupby(['t1', 'result']).size().iteritems():
        teams[team]['wins'] += nGames if result == 1 else 0
        teams[team]['losses'] += nGames if result == 0 else 0
    for ((team, result), nGames) in games.groupby(['t2', 'result']).size().iteritems():
        teams[team]['wins'] += nGames if result == 0 else 0
        teams[team]['losses'] += nGames if result == 1 else 0
    return teams


class trueskillModel():

    @staticmethod
    def applyModel(allGames, games, teams):
        for team in teams:
            teams[team]['rating'] = ts.Rating()
        allGames['expected'] = np.nan
        if 'snapshot' not in allGames:
            allGames['snapshot'] = 0
        allGames['snapshot'] = allGames['snapshot'].astype(dict)
        for i in games.index:
            allGames.set_value(i, 'expected', trueskillModel.expectedWinRate(teams[games.ix[i, 't1']]['rating'], teams[games.ix[i, 't2']]['rating']))
            (teams[games.ix[i, 't1']]['rating'],), (teams[games.ix[i, 't2']]['rating'],) = ts.rate(
                [(teams[games.ix[i, 't1']]['rating'],), (teams[games.ix[i, 't2']]['rating'],)],
                [1 - games.ix[i, 'result'], games.ix[i, 'result']])
            allGames.set_value(i, 'snapshot', {k: v['rating'] for k, v in teams.items()})

    @staticmethod
    def expectedWinRate(rA, rB):
        deltaMu = rA.mu - rB.mu + 180
        sumSigma = rA.sigma ** 2 + rB.sigma ** 2
        denominator = math.sqrt(4 * (200 * 200) + sumSigma)
        return ts.global_env().cdf(deltaMu / denominator)

    @staticmethod
    def getRatingMu(r):
        return r.mu

    @staticmethod
    def getRatingSigma(r):
        return r.sigma


model = trueskillModel


def winRateBo1ToBo3(p):
    return p * p * (3 - 2 * p)

leagueTeams = {}

for league, games in allGames.groupby('league'):
    teams = getTeams(games)
    model.applyModel(allGames, games, teams)
    leagueTeams[league] = teams


# need to spearate so we can see the new changes in iteration
for league, games in allGames.groupby('league'):
    teams = leagueTeams[league]
    print('***** ' + config['tournaments'][league]['title'] + ' *****')
    print('*** Current Ratings ***')
    print('{:2}  {:25}  {:11}  {:6}  {:6}'.format('', 'Team', 'Games (W/L)', 'Rating', 'SD'))
    i = 1
    teams = sorted(teams.values(), key=lambda x: model.getRatingMu(x['rating']), reverse=True)
    for team in teams:
        print('{:2d}  {:25.25}  {:<3d} ({:>2d}/{:>2d})  {:<6.1f}  {:<6.1f}'.format(i, team['name'], team['games'], team['wins'],
                                                                                   team['losses'], model.getRatingMu(team['rating']),
                                                                                   model.getRatingSigma(team['rating'])))
        i += 1
    print()
    print('Mean of Ratings: ' + str(np.mean(list(map(lambda t: model.getRatingMu(t['rating']), teams)))))
    print('Mean of Ratings: ' + str(np.std(list(map(lambda t: model.getRatingMu(t['rating']), teams)))))
    print('Range of Ratings: ' + str(model.getRatingMu(teams[0]['rating']) - model.getRatingMu(teams[-1]['rating'])))
    print()

    print('**** Ratings by Period ****')
    print(('{:8s} {:12s} {:12s} ' + '{:8s} ' * len(teams)).format('Period', 'Start', 'End', *[t['shortName'] for t in teams]))
    for period, games in games.groupby('period'):
        firstGame = games.iloc[0]
        lastGame = games.iloc[-1]
        print(('{:<8d} {:12s} {:12s} ' + '{:<8.1f} ' * len(teams)).format(period, firstGame['date'], lastGame['date'], *[model.getRatingMu(lastGame['snapshot'][t['name']]) for t in teams]))
    print()

    print('**** Estimated Win Rates (BO1) ****')
    for team in teams:
        print(('{:6s}' + ('{:<8.2f} ' * len(teams))).format(team['shortName'], *[100 * model.expectedWinRate(team['rating'], t['rating']) for t in teams]))
    print()

    print('**** Estimated Win Rates (BO3) ****')
    print(('{:6s}' + ('{:8s} ' * len(teams))).format('', *[t['shortName'] for t in teams]))
    for team in teams:
        print(('{:6s}' + ('{:<8.2f} ' * len(teams))).format(team['shortName'], *[100 * winRateBo1ToBo3(model.expectedWinRate(team['rating'], t['rating'])) for t in teams]))
    print()

allGames = allGames[(allGames['matchGame'] == 1) & (allGames['match'] > 4)]
print(((allGames['expected'] - allGames['result'])**2).describe())
