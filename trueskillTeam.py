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


def applyTrueskill(games, teams):
    for team in teams:
        teams[team]['rating'] = ts.Rating()
    for i in games.index:
        (teams[games.ix[i, 't1']]['rating'],), (teams[games.ix[i, 't2']]['rating'],) = ts.rate(
            [(teams[games.ix[i, 't1']]['rating'],), (teams[games.ix[i, 't2']]['rating'],)],
            [1 - games.ix[i, "result"], games.ix[i, "result"]])


def winRate(rA, rB):
    deltaMu = rA.mu - rB.mu
    sumSigma = rA.sigma ** 2 + rB.sigma ** 2
    denominator = math.sqrt(4 * (200 * 200) + sumSigma)
    return ts.global_env().cdf(deltaMu / denominator)


def winRateBo3(rA, rB):
    p = winRate(rA, rB)
    return p * p * (3 - 2 * p) * 100


for league, games in allGames.groupby('league'):
    teams = {}
    for team in np.unique(np.append(games['t1'], games['t2'])):
        teams[team] = {
            "name": team,
            "shortName": namesTranslate[team],
        }
    for (team, nGames) in (games.groupby('t1').size() + games.groupby('t2').size()).iteritems():
        teams[team]['games'] = nGames
    applyTrueskill(games, teams)

    print('***** ' + config['tournaments'][league]['title'] + ' *****')
    print('*** Current Ratings ***')
    print("{:2}  {:25}  {:11}  {:8}  {:8}".format("", "Team", "Games (W/L)", "Rating", "SD"))
    i = 1
    teams = sorted(teams.values(), key=lambda x: x["rating"].mu, reverse=True)
    for team in teams:
        print("{:2d}  {:25.25}  {:<5d}  {:<8.1f}  {:<8.1f}".format(i, team["name"], team["games"], team["rating"].mu, team["rating"].sigma))
        i += 1
    print()
    print('Mean of Ratings: ' + str(np.mean(list(map(lambda t: t['rating'].mu, teams)))))
    print('Mean of Ratings: ' + str(np.std(list(map(lambda t: t['rating'].mu, teams)))))
    print('Range of Ratings: ' + str(teams[0]['rating'].mu - teams[-1]['rating'].mu))
    print()

    # if (model['ratingPeriods']) {
    #     print('**** Ratings by Period ****')
    #     formatS = '%-8s %-12s %-12s ' + _.repeat('%-8s ', len(teams))
    #     print(_.spread(_.partial(printf, formatS, 'Period', 'Start', 'End'))(teams.map((p)= > p.name)))
    #     formatS = '%-8s %-12s %-12s ' + _.repeat('%-8.1f ', len(teams))
    #     model['ratingPeriods'].forEach(function(period, i) {
    #         print(_.spread(_.partial(printf, formatS, i + 1, period.startDate, period.endDate))(teams.map((p)=> {
    #             return (period['ratings'][p.name] & & period['ratings'][p.name].rating) | | 1500
    #         })))
    #     })
    #     print()
    # }

    print('**** Estimated Win Rates (BO1) ****')
    print(('{:6s} ' + ('{:8s} ' * len(teams))).format('', *map(lambda t: t['shortName'], teams)))
    for team in teams:
        print(('{:6s}' + ('{:-8.2f} ' * len(teams))).format(team['shortName'], *map(lambda t: winRate(team['rating'], t['rating']), teams)))
    print()

    print('**** Estimated Win Rates (BO3) ****')
    print(('{:6s} ' + ('{:8s} ' * len(teams))).format('', *map(lambda t: t['shortName'], teams)))
    for team in teams:
        print(('{:6s}' + ('{:-8.2f} ' * len(teams))).format(team['shortName'], *map(lambda t: winRateBo3(team['rating'], t['rating']), teams)))
    print()
