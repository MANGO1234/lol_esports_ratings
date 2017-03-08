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


model = m.TrueskillModel
model = m.TrueskillModelPeriod
model = m.GlickoModel
model = m.GlickoModelPeriod
model = m.GlickoModelPerGame

data = getGames(getLeagues(key))
allGames = data.getGames()
leagueTeams = {}
for league, games in allGames.groupby('league'):
    teams = m.getTeams(games)
    model.applyModel(allGames, games, teams)
    leagueTeams[league] = teams

games = allGames
for league, games in allGames.groupby("league"):
    print(league)
    g = games[(games['period'] >= 4)]
    print(str(((g['expected'] - g['result'])**2).mean()) + '(' + str(len(g.index)) + ')')
    g = games[(games['period'] >= 4) & (games['matchGame'] == 1)]
    print(str(((g['expected'] - g['result'])**2).mean()) + '(' + str(len(g.index)) + ')')
    g = games[(games['period'] >= 4) & (games['matchGame'] == 2)]
    print(str(((g['expected'] - g['result'])**2).mean()) + '(' + str(len(g.index)) + ')')
    g = games[(games['period'] >= 4) & (games['matchGame'] == 3)]
    print(str(((g['expected'] - g['result'])**2).mean()) + '(' + str(len(g.index)) + ')')

print()
print(len(allGames[allGames["patch"] == "7.1"]))
print(len(allGames[(allGames["patch"] == "7.1") & (allGames["result"] == 1)]) / len(allGames[allGames["patch"] == "7.1"]))
print(len(allGames[allGames["patch"] == "7.2"]))
print(len(allGames[(allGames["patch"] == "7.2") & (allGames["result"] == 1)]) / len(allGames[allGames["patch"] == "7.2"]))
print(len(allGames[allGames["patch"] == "7.3"]))
print(len(allGames[(allGames["patch"] == "7.3") & (allGames["result"] == 1)]) / len(allGames[allGames["patch"] == "7.3"]))
print(len(allGames[allGames["patch"] == "7.4"]))
print(len(allGames[(allGames["patch"] == "7.4") & (allGames["result"] == 1)]) / len(allGames[allGames["patch"] == "7.4"]))

# a = [1]

# import matplotlib.pyplot as plt

# # the histogram of the data
# n, bins, patches = plt.hist(a, 50, normed=1, facecolor='g', alpha=0.75)


# plt.xlabel('Smarts')
# plt.ylabel('Probability')
# plt.title('Histogram of IQ')
# plt.text(60, .025, r'$\mu=100,\ \sigma=15$')
# plt.grid(True)
# plt.show()
