import math
import json
import sys

import numpy as np
import matplotlib
matplotlib.use("tkagg")

import matplotlib.pyplot as plt
import ratingModels as m


from data import getLeagues, getGames, getGamesWithDetails

with open('matches/leagues.json') as data_file:
    config = json.load(data_file)

key = sys.argv[1]


def winRateBo1ToBo3(p):
    return p * p * (3 - 2 * p)


def brier(games):
    return ((games['expected'] - games['result'])**2).mean()


def brierStr(games):
    return str(brier(games)) + ' (' + str(len(games.index)) + ')'


WEEK = 5


def quickOutput(title, model):
    data = getGames(getLeagues(key))
    allGames = data.getGames()
    leagueTeams = {}
    for league, games in allGames.groupby('league'):
        teams = m.getTeams(games)
        model.applyModel(allGames, games, teams)
        leagueTeams[league] = teams

    print('***** ' + title + ' *****')
    games = allGames
    # for league, games in allGames.groupby("league"):
    #     print('*** ' + league + ' ***')
    #     print(brierStr(games[(games['period'] >= WEEK)]))
    #     print(brierStr(games[(games['period'] >= WEEK) & (games['matchGame'] == 1)]))
    #     print(brierStr(games[(games['period'] >= WEEK) & (games['matchGame'] == 2)]))
    #     print(brierStr(games[(games['period'] >= WEEK) & (games['matchGame'] == 3)]))

    print()
    print('*** all ***')
    print(brierStr(allGames[allGames['period'] >= WEEK]))
    print(brierStr(allGames[(allGames['period'] >= WEEK) & (allGames['matchGame'] == 1)]))
    print(brierStr(allGames[(allGames['period'] >= WEEK) & (allGames['matchGame'] == 2)]))
    print(brierStr(allGames[(allGames['period'] >= WEEK) & (allGames['matchGame'] == 3)]))
    print()

type = 1
if type == 1:
    quickOutput('TrueskillModel', m.TrueskillModel)
    quickOutput('GlickoModel', m.GlickoModel)
    quickOutput('GlickoModelPerGame', m.GlickoModelPerGame)
