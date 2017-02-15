import _sqlite3 as sql
import json
import sys
import time

with open('matches/leagues.json') as data_file:
    config = json.load(data_file)
with open('matches/names.json') as data_file:
    namesTranslate = json.load(data_file)


class Matches():

    def __init__(self, rawLeagues):
        self.rawLeagues = rawLeagues

        def addTeam(teams, name):
            if name in namesTranslate:
                shortName = namesTranslate[name]
            else:
                shortName = name
            if shortName not in teams:
                teams[shortName] = {
                    'name': shortName,
                    'fullName': name
                }

        def toPeriods(matches):
            periods = []
            newPeriod = {
                'matches': []
            }
            lastMatch = None
            firstMatch = True
            for match in matches:
                if firstMatch:
                    newPeriod['startDate'] = match['date']
                    newPeriod['matches'].append(match)
                    firstMatch = False
                else:
                    matchDate = time.strptime(match['date'], '%y-%m-%d')
                    lastMatchDate = time.strptime(lastMatch['date'], '%y-%m-%d')
                    print(time.mktime(matchDate.date()))
                    if time.mktime(matchDate.date()) - time.mktime(lastMatchDate.date()) <= 25 * 60 * 60 * 1000:
                        newPeriod.matches.append(match)
                    # fix: sometimes the days in the week is not consecutive
                    elif ((match['league'] == "lck15ar" and match['date'] == "2015-01-09")
                          or (match['league'] == "lck15ar" and match['date'] == "2015-01-16")
                          or (match['league'] == "lck15ar" and match['date'] == "2015-01-23")
                          or (match['league'] == "lck15ar" and match['date'] == "2015-01-30")
                          or (match['league'] == "lck15ar" and match['date'] == "2015-02-06")
                          or (match['league'] == "lck15ar" and match['date'] == "2015-02-13")
                          or (match['league'] == "lck15ar" and match['date'] == "2015-02-27")
                          or (match['league'] == "lck15ar" and match['date'] == "2015-03-06")
                          or (match['league'] == "lck15ar" and match['date'] == "2015-03-20")
                          or (match['league'] == "lck15ar" and match['date'] == "2015-03-27")
                          or (match['league'] == "lck15ar" and match['date'] == "2015-04-03")
                          or (match['league'] == "lck15ar" and match['date'] == "2015-04-10")
                          or (match['league'] == "lck15br" and match['date'] == "2015-06-05")
                          or (match['league'] == "lck15br" and match['date'] == "2015-06-07")
                          or (match['league'] == "lck15br" and match['date'] == "2015-06-19")
                          or (match['league'] == "lck15br" and match['date'] == "2015-07-24")
                          or (match['league'] == "lck17ar" and match['date'] == "2017-01-21")
                          or (match['league'] == "lck17ar" and match['date'] == "2017-02-04")
                          or (match['league'] == "lck17ar" and match['date'] == "2017-02-11")):
                        newPeriod.matches.append(match)
                    else:
                        newPeriod['endDate'] = newPeriod['matches'][len(newPeriod.matches) - 1]['date']
                        periods.append(newPeriod)
                        newPeriod = {
                            'matches': [match],
                            'startDate': match.date
                        }
                lastMatch = match

            if len(newPeriod['matches']):
                newPeriod['endDate'] = newPeriod['matches'][len(newPeriod['matches']) - 1]['date']
                periods.append(newPeriod)
            print(len(periods[0]['matches']))
            return periods

        leagues = {}
        for league in rawLeagues:
            teams = {}
            for match in league['matches']:
                addTeam(teams, match['t1'])
                addTeam(teams, match['t2'])
            periods = toPeriods(league['matches'])
            leagues[league['league']] = {
                'rawMatches': league['matches'],
                'teams': teams,
                'periods': periods
            }
        self.leagues = leagues


def getLeagues(key):
    if key in config["tournaments"]:
        return [key]
    elif key in config["combined"]:
        return config["combined"][key]
    elif key == 'all':
        return list(config['tournaments'].keys())
    else:
        raise Exception("Key not find")


def getMatches(leagues):
    conn = sql.connect('matches/matches.db')
    conn.row_factory = sql.Row
    db = conn.cursor()
    matches = []
    for league in leagues:
        matches.append({
            'league': league,
            'matches': list(map(dict, list(db.execute("select * from matches where league in ('" + league + "') order by date,id"))))
        })
    conn.close()
    return Matches(matches)


key = sys.argv[1]
getMatches(getLeagues(key)).leagues
