import json
import math

import numpy as np
import trueskill as ts
import lib.glicko2 as glicko


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


def trueskillExpectedWinRate(r1, r2):
    deltaMu = r1.mu - r2.mu
    sumSigma = r1.sigma ** 2 + r2.sigma ** 2
    denominator = math.sqrt(4 * (200 * 200) + sumSigma)
    return ts.global_env().cdf(deltaMu / denominator)


def g(variance):
    return 1 / math.sqrt(1 + 3 * math.pow(math.log(10) / 400 / math.pi, 2) * variance)


def glickoExpectedWinRate(r1, r2):
    return 1 / (1 + math.pow(10, g(r1.getRd() * r1.getRd() + r2.getRd() * r2.getRd()) * (r2.getRating() - r1.getRating()) / 400))


class TrueskillModel():

    @staticmethod
    def applyModel(allGames, games, teams):
        for team in teams:
            teams[team]['rating'] = ts.Rating()
        if 'expected' not in allGames:
            allGames['expected'] = np.nan
        if 'snapshot' not in allGames:
            allGames['snapshot'] = 0
        allGames['snapshot'] = allGames['snapshot'].astype(dict)
        for i in games.index:
            allGames.set_value(i, 'expected', trueskillExpectedWinRate(teams[games.ix[i, 't1']]['rating'], teams[games.ix[i, 't2']]['rating']))
            (teams[games.ix[i, 't1']]['rating'],), (teams[games.ix[i, 't2']]['rating'],) = ts.rate(
                [(teams[games.ix[i, 't1']]['rating'],), (teams[games.ix[i, 't2']]['rating'],)],
                [1 - games.ix[i, 'result'], games.ix[i, 'result']])
            allGames.set_value(i, 'snapshot', {k: v['rating'] for k, v in teams.items()})

    @staticmethod
    def expectedWinRate(r1, r2):
        return trueskillExpectedWinRate(r1, r2)

    @staticmethod
    def getRatingMu(r):
        return r.mu

    @staticmethod
    def getRatingSigma(r):
        return r.sigma


class TrueskillModelPeriod():

    @staticmethod
    def applyModel(allGames, games, teams):
        for team in teams:
            teams[team]['rating'] = ts.Rating()
        if 'expected' not in allGames:
            allGames['expected'] = np.nan
        if 'snapshot' not in allGames:
            allGames['snapshot'] = 0
        allGames['snapshot'] = allGames['snapshot'].astype(dict)
        for period, periodGames in games.groupby("period"):
            for i in periodGames.index:
                allGames.set_value(i, 'expected', trueskillExpectedWinRate(teams[games.ix[i, 't1']]['rating'], teams[games.ix[i, 't2']]['rating']))
            for i in periodGames.index:
                (teams[games.ix[i, 't1']]['rating'],), (teams[games.ix[i, 't2']]['rating'],) = ts.rate(
                    [(teams[games.ix[i, 't1']]['rating'],), (teams[games.ix[i, 't2']]['rating'],)],
                    [1 - games.ix[i, 'result'], games.ix[i, 'result']])
                allGames.set_value(i, 'snapshot', {k: v['rating'] for k, v in teams.items()})

    @staticmethod
    def expectedWinRate(r1, r2):
        return trueskillExpectedWinRate(r1, r2)

    @staticmethod
    def getRatingMu(r):
        return r.mu

    @staticmethod
    def getRatingSigma(r):
        return r.sigma


class GlickoModel():

    @staticmethod
    def applyModel(allGames, games, teams):
        ratings = []
        for team in teams:
            teams[team]['rating'] = glicko.Player()
            ratings.append(teams[team]['rating'])
        if 'expected' not in allGames:
            allGames['expected'] = np.nan
        if 'snapshot' not in allGames:
            allGames['snapshot'] = 0
        allGames['snapshot'] = allGames['snapshot'].astype(dict)
        for period, periodGames in games.groupby("period"):
            snapshot = {k: v['rating'].clone() for k, v in teams.items()}
            for i in periodGames.index:
                allGames.set_value(i, 'expected', glickoExpectedWinRate(snapshot[games.ix[i, 't1']], snapshot[games.ix[i, 't2']]))
                glicko.updateResults([(snapshot[games.ix[i, 't1']], snapshot[games.ix[i, 't2']], games.ix[i, 'result'])])
                allGames.set_value(i, 'snapshot', {k: v.clone() for k, v in snapshot.items()})
            g = []
            for i in periodGames.index:
                g.append((teams[games.ix[i, 't1']]['rating'], teams[games.ix[i, 't2']]['rating'], games.ix[i, 'result']))
            glicko.updatePeriod(ratings, g)
            allGames.set_value(periodGames.index[-1], 'snapshot', {k: v['rating'].clone() for k, v in teams.items()})

    @staticmethod
    def expectedWinRate(r1, r2):
        return glickoExpectedWinRate(r1, r2)

    @staticmethod
    def getRatingMu(r):
        return r.getRating()

    @staticmethod
    def getRatingSigma(r):
        return r.getRd()


class GlickoModelPerGame():

    @staticmethod
    def applyModel(allGames, games, teams):
        for team in teams:
            teams[team]['rating'] = glicko.Player()
        if 'expected' not in allGames:
            allGames['expected'] = np.nan
        if 'snapshot' not in allGames:
            allGames['snapshot'] = 0
        allGames['snapshot'] = allGames['snapshot'].astype(dict)
        for i in games.index:
            allGames.set_value(i, 'expected', glickoExpectedWinRate(teams[games.ix[i, 't1']]['rating'], teams[games.ix[i, 't2']]['rating']))
            glicko.updateResults([(teams[games.ix[i, 't1']]['rating'], teams[games.ix[i, 't2']]['rating'], games.ix[i, 'result'])])
            allGames.set_value(i, 'snapshot', {k: v['rating'].clone() for k, v in teams.items()})

    @staticmethod
    def expectedWinRate(r1, r2):
        return glickoExpectedWinRate(r1, r2)

    @staticmethod
    def getRatingMu(r):
        return r.getRating()

    @staticmethod
    def getRatingSigma(r):
        return r.getRd()


class GlickoModelPeriod():

    @staticmethod
    def applyModel(allGames, games, teams):
        ratings = []
        for team in teams:
            teams[team]['rating'] = glicko.Player()
            ratings.append(teams[team]['rating'])
        if 'expected' not in allGames:
            allGames['expected'] = np.nan
        if 'snapshot' not in allGames:
            allGames['snapshot'] = 0
        allGames['snapshot'] = allGames['snapshot'].astype(dict)
        for period, periodGames in games.groupby("period"):
            for i in periodGames.index:
                allGames.set_value(i, 'expected', glickoExpectedWinRate(teams[games.ix[i, 't1']]['rating'], teams[games.ix[i, 't2']]['rating']))
            for i in periodGames.index:
                allGames.set_value(i, 'snapshot', {k: v['rating'].clone() for k, v in teams.items()})
            g = []
            for i in periodGames.index:
                g.append((teams[games.ix[i, 't1']]['rating'], teams[games.ix[i, 't2']]['rating'], games.ix[i, 'result']))
            glicko.updatePeriod(ratings, g)
            allGames.set_value(periodGames.index[-1], 'snapshot', {k: v['rating'].clone() for k, v in teams.items()})

    @staticmethod
    def expectedWinRate(r1, r2):
        return glickoExpectedWinRate(r1, r2)

    @staticmethod
    def getRatingMu(r):
        return r.getRating()

    @staticmethod
    def getRatingSigma(r):
        return r.getRd()
