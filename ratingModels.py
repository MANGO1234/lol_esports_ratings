import json
import math

import numpy as np
import trueskill as ts


from data import getLeagues, getGames

with open('matches/names.json') as data_file:
    namesTranslate = json.load(data_file)


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


ts.setup(mu=1500, sigma=300, beta=200, draw_probability=0)


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
        deltaMu = rA.mu - rB.mu
        sumSigma = rA.sigma ** 2 + rB.sigma ** 2
        denominator = math.sqrt(4 * (200 * 200) + sumSigma)
        return ts.global_env().cdf(deltaMu / denominator)

    @staticmethod
    def getRatingMu(r):
        return r.mu

    @staticmethod
    def getRatingSigma(r):
        return r.sigma
