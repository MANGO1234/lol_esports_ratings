import sqlite3 as sql
import json
import time

import pandas as pd

with open('matches/leagues.json') as data_file:
    config = json.load(data_file)

pd.set_option('display.max_columns', 500)
pd.set_option('display.width', 1000)


class Games():

    def __init__(self, rawGames, details=False):
        self.rawGames = rawGames
        rawGames['period'] = 0
        rawGames['match'] = 0
        rawGames['matchLeague'] = 0
        rawGames['matchAll'] = 0
        rawGames['matchGame'] = 0
        rawGames['prevGameIx'] = -1
        rawGames['timestamp'] = rawGames['date'].map(lambda row: time.mktime(time.strptime(row, '%Y-%m-%d')))
        if details:
            rawGames['data'] = rawGames['data'].map(lambda x: None if x is None else json.loads(x))
        rawGames.sort_values(['league', 'date', 'id'], ascending=True, inplace=True)
        rawGames.reset_index(drop=True, inplace=True)

        # fix: sometimes the days in the week is not consecutive
        ignoreGames = {
            ('lck15ar', '2015-01-09'),
            ('lck15ar', '2015-01-16'),
            ('lck15ar', '2015-01-23'),
            ('lck15ar', '2015-01-30'),
            ('lck15ar', '2015-02-06'),
            ('lck15ar', '2015-02-13'),
            ('lck15ar', '2015-02-27'),
            ('lck15ar', '2015-03-06'),
            ('lck15ar', '2015-03-20'),
            ('lck15ar', '2015-03-27'),
            ('lck15ar', '2015-04-03'),
            ('lck15ar', '2015-04-10'),
            ('lck15br', '2015-06-05'),
            ('lck15br', '2015-06-07'),
            ('lck15br', '2015-06-19'),
            ('lck15br', '2015-07-24'),
            ('lck17ar', '2017-01-21'),
            ('lck17ar', '2017-02-04'),
            ('lck17ar', '2017-02-11'),
            ('lck17ar', '2017-02-18'),
            ('lck17ar', '2017-03-04'),
            ('ck17ar', '2017-01-20'),
            ('ck17ar', '2017-02-10'),
            ('ck17ar', '2017-02-17'),
            ('ck17ar', '2017-02-24'),
            ('ck17ar', '2017-03-03'),
            ('ck17ar', '2017-03-05'),
        }

        for league, games in rawGames.groupby('league'):
            period = 1
            start = games.index[0]
            for i in games.index:
                if i != start and games.ix[i, 'timestamp'] - games.ix[i - 1, 'timestamp'] > 25 * 60 * 60 and (league, games.ix[i, 'date']) not in ignoreGames:
                    period += 1
                rawGames.set_value(i, 'period', period)

        matchAll = 1
        matchLeagues = {}
        for (league, period), games in rawGames.groupby(['league', 'period']):
            match = 1
            if league not in matchLeagues:
                matchLeagues[league] = 1
            indexes = games.index
            for k in range(0, len(indexes)):
                i = indexes[k]
                if rawGames.ix[i, 'match'] == 0:
                    rawGames.set_value(i, 'match', match)
                    rawGames.set_value(i, 'matchLeague', matchLeagues[league])
                    rawGames.set_value(i, 'matchAll', matchAll)
                    rawGames.set_value(i, 'matchGame', 1)
                    t1 = games.ix[i, 't1']
                    t2 = games.ix[i, 't2']
                    prevGameIx = i
                    matchGame = 2
                    for l in range(k + 1, len(indexes)):
                        j = indexes[l]
                        if (games.ix[j, 't1'] == t1 and games.ix[j, 't2'] == t2) or (games.ix[j, 't1'] == t2 and games.ix[j, 't2'] == t1):
                            rawGames.set_value(j, 'match', match)
                            rawGames.set_value(j, 'matchLeague', matchLeagues[league])
                            rawGames.set_value(j, 'matchAll', matchAll)
                            rawGames.set_value(j, 'matchGame', matchGame)
                            rawGames.set_value(j, 'prevGameIx', prevGameIx)
                            prevGameIx = j
                            matchGame += 1
                    match += 1
                    matchLeagues[league] += 1
                    matchAll += 1

    def getGames(self):
        return self.rawGames.copy()


def getLeagues(key):
    if key in config["tournaments"]:
        return [key]
    elif key in config["combined"]:
        return config["combined"][key]
    elif key == 'all':
        return list(config['tournaments'].keys())
    else:
        raise Exception("Key not find")


def getGames(leagues):
    with sql.connect('matches/matches.db') as con:
        return Games(pd.read_sql_query("select * from matches where league in ('" + "','".join(leagues) + "')", con))


def getGamesWithDetails(leagues):
    with sql.connect('matches/matches.db') as con:
        return Games(pd.read_sql_query("select * from matches m left natural join details d where m.league in ('" + "','".join(leagues) + "') order by m.date,m.id", con), True)
