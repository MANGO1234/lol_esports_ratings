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


WEEK_BEGIN = 5
WEEK_END = 20
WEEK = 4

BLUE_SIDE = {
    # 'na17ar': 85,
    # 'eu17ar': 85,
    # 'lck17ar': 85,
    # 'lpl17ar': 85,
    # 'na16br': 20,
    # 'eu16br': 20,
    # 'lck16br': 20,
    # 'lpl16br': 20,
    # 'lms16br': 20
}


def quickOutput(title, model):
    data = getGames(getLeagues(key))
    allGames = data.getGames()
    leagueTeams = {}
    for league, games in allGames.groupby('league'):
        teams = m.getTeams(games)
        model.applyModel(allGames, games, teams, BLUE_SIDE)
        leagueTeams[league] = teams

    # print('***** ' + title + ' *****')
    # games = allGames
    # for league, games in allGames.groupby("league"):
    #     print('*** ' + league + ' ***')
    #     print(brierStr(games[(games['period'] >= WEEK)]))
    #     print(brierStr(games[(games['period'] >= WEEK) & (games['matchGame'] == 1)]))
    #     print(brierStr(games[(games['period'] >= WEEK) & (games['matchGame'] == 2)]))
    #     print(brierStr(games[(games['period'] >= WEEK) & (games['matchGame'] == 3)]))

    print()
    print('*** all ***')
    print(brierStr(allGames[(allGames['period'] >= WEEK_BEGIN) & (allGames['period'] <= WEEK_END)]))
    print(brierStr(allGames[((allGames['period'] >= WEEK_BEGIN) & (allGames['period'] <= WEEK_END)) & (allGames['matchGame'] == 1)]))
    print(brierStr(allGames[((allGames['period'] >= WEEK_BEGIN) & (allGames['period'] <= WEEK_END)) & (allGames['matchGame'] == 2)]))
    print(brierStr(allGames[((allGames['period'] >= WEEK_BEGIN) & (allGames['period'] <= WEEK_END)) & (allGames['matchGame'] == 3)]))
    print()


def blueSideAdvantage(leagues, model):
    blue = BLUE_SIDE.copy()
    data = getGames(getLeagues(key))
    allGames = data.getGames()
    leagueGames = allGames[allGames['league'].isin(leagues)]

    for i in range(-20, 120, 5):
        leagueTeams = {}
        for league, games in leagueGames.groupby('league'):
            blue[league] = i
            teams = m.getTeams(games)
            model.applyModel(allGames, games, teams, blue)
            leagueTeams[league] = teams
        print(i, brierStr(allGames[(allGames['period'] >= WEEK)]))


type = 1
if type == 1:
    quickOutput('TrueskillModel', m.TrueskillModel)
    quickOutput('GlickoModel', m.GlickoModel)
    quickOutput('GlickoModelPerGame', m.GlickoModelPerGame)
elif type == 2:
    blueSideAdvantage(getLeagues(key), m.GlickoModel)
