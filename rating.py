import json
import sys

import numpy as np
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


# need to separate so we can see the new changes in iteration
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
