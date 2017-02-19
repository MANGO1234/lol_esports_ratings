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

model = m.TrueskillModel
model = m.TrueskillModelPeriod
model = m.GlickoModelPerGame


def winRateBo1ToBo3(p):
    return p * p * (3 - 2 * p)


data = getGames(getLeagues(key))
allGames = data.getGames()
leagueTeams = {}
for league, games in allGames.groupby('league'):
    teams = m.getTeams(games)
    model.applyModel(allGames, games, teams)
    leagueTeams[league] = teams

for league, games in allGames.groupby("league"):
    # games = games[(games['period'] > 4)]
    games = games[(games['period'] >= 4)]
    print(league + ": " + str(((games['expected'] - games['result'])**2).mean()))
