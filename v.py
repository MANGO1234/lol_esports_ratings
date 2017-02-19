import math
import json
import sys

import numpy as np
import matplotlib
matplotlib.use("tkagg")

import matplotlib.pyplot as plt
import ratingModels as m


from data import getLeagues, getGames

with open('matches/leagues.json') as data_file:
    config = json.load(data_file)

key = sys.argv[1]


def winRateBo1ToBo3(p):
    return p * p * (3 - 2 * p)


model = m.GlickoModelPeriod
model = m.GlickoModelPerGame
model = m.TrueskillModel
model = m.TrueskillModelPeriod

data = getGames(getLeagues(key))
allGames = data.getGames()
leagueTeams = {}
for league, games in allGames.groupby('league'):
    teams = m.getTeams(games)
    model.applyModel(allGames, games, teams)
    leagueTeams[league] = teams

for league, games in allGames.groupby("league"):
    print(league)
    g = games[(games['period'] > 4)]
    print(str(((g['expected'] - g['result'])**2).mean()) + '(' + str(len(g.index)) + ')')
    g = games[(games['period'] > 4) & (games['matchGame'] == 1)]
    print(str(((g['expected'] - g['result'])**2).mean()) + '(' + str(len(g.index)) + ')')
    g = games[(games['period'] > 4) & (games['matchGame'] == 2)]
    print(str(((g['expected'] - g['result'])**2).mean()) + '(' + str(len(g.index)) + ')')
    g = games[(games['period'] > 4) & (games['matchGame'] == 3)]
    print(str(((g['expected'] - g['result'])**2).mean()) + '(' + str(len(g.index)) + ')')


model = m.GlickoModel

data = getGames(getLeagues(key))
allGames = data.getGames()
leagueTeams = {}
for league, games in allGames.groupby('league'):
    teams = m.getTeams(games)
    model.applyModel(allGames, games, teams)
    leagueTeams[league] = teams

for league, games in allGames.groupby("league"):
    print(league)
    g = games[(games['period'] > 4)]
    print(str(((g['expected'] - g['result'])**2).mean()) + '(' + str(len(g.index)) + ')')
    g = games[(games['period'] > 4) & (games['matchGame'] == 1)]
    print(str(((g['expected'] - g['result'])**2).mean()) + '(' + str(len(g.index)) + ')')
    g = games[(games['period'] > 4) & (games['matchGame'] == 2)]
    print(str(((g['expected'] - g['result'])**2).mean()) + '(' + str(len(g.index)) + ')')
    g = games[(games['period'] > 4) & (games['matchGame'] == 3)]
    print(str(((g['expected'] - g['result'])**2).mean()) + '(' + str(len(g.index)) + ')')
