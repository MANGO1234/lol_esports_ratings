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
data = getGames(getLeagues(key))
allGames = data.getGames()

model = m.trueskillModel


def winRateBo1ToBo3(p):
    return p * p * (3 - 2 * p)


leagueTeams = {}
for league, games in allGames.groupby('league'):
    teams = m.getTeams(games)
    model.applyModel(allGames, games, teams)
    leagueTeams[league] = teams

# allGames = allGames[(allGames['matchGame'] == 1) & (allGames['period'] > 2)]
allGames = allGames[(allGames['period'] > 2)]
(allGames['expected']).plot.hist(bins=20)
plt.show()
