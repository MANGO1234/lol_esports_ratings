import json
import sys
import ratingModels as m

from data import getLeagues, getGames

bo3s = [
    [0, 0, 0],
    [0, 0, 1],
    [0, 1, 0],
    [0, 1, 1],
    [1, 0, 0],
    [1, 0, 1],
    [1, 1, 0],
    [1, 1, 1]
]

bo5s = [
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 1],
    [0, 0, 0, 1, 0],
    [0, 0, 0, 1, 1],
    [0, 0, 1, 0, 0],
    [0, 0, 1, 0, 1],
    [0, 0, 1, 1, 0],
    [0, 0, 1, 1, 1],
    [0, 1, 0, 0, 0],
    [0, 1, 0, 0, 1],
    [0, 1, 0, 1, 0],
    [0, 1, 0, 1, 1],
    [0, 1, 1, 0, 0],
    [0, 1, 1, 0, 1],
    [0, 1, 1, 1, 0],
    [0, 1, 1, 1, 1],
    [1, 0, 0, 0, 0],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 1, 0],
    [1, 0, 0, 1, 1],
    [1, 0, 1, 0, 0],
    [1, 0, 1, 0, 1],
    [1, 0, 1, 1, 0],
    [1, 0, 1, 1, 1],
    [1, 1, 0, 0, 0],
    [1, 1, 0, 0, 1],
    [1, 1, 0, 1, 0],
    [1, 1, 0, 1, 1],
    [1, 1, 1, 0, 0],
    [1, 1, 1, 0, 1],
    [1, 1, 1, 1, 0],
    [1, 1, 1, 1, 1]
]

with open('matches/leagues.json') as data_file:
    config = json.load(data_file)

with open('matches/names.json') as data_file:
    namesTranslateP = json.load(data_file)

namesTranslate = {}
for k, v in namesTranslateP.items():
    namesTranslate[v] = k

key = sys.argv[1]

model = m.TrueskillModel
model = m.GlickoModel
model = m.GlickoModelPerGame

leagues = getLeagues(key)
if len(leagues) > 1:
    print('only 1 league allows')
    exit()

data = getGames(leagues)
league = leagues[0]
games = data.getGames()
teams = m.getTeams(games)
model.applyModel(games, games, teams)


t1ShortName = sys.argv[2].upper()
t2ShortName = sys.argv[3].upper()
t1Name = namesTranslate[sys.argv[2].upper()]
t2Name = namesTranslate[sys.argv[3].upper()]


def wlCountKey(a):
    upto = (len(a) - 1) / 2 + 1
    w = 0
    x = 0
    for r in a:
        if w >= upto or x >= upto:
            break
        w += r
        x += 1 - r
    return 'w' + str(w) + 'x' + str(x)


def staticFn(p, a):
    c = 1
    for r in a:
        c *= p if r == 1 else 1 - p
    return c


def dynamicFn(p, a):
    results = []
    for r in a:
        results.append({'date': '2030-12-31', 't1': t1Name, 't2': t2Name, 'result': r})
    games = data.getGames()
    length = len(games)
    teams = m.getTeams(games)
    games = games.append(results, ignore_index=True)
    model.applyModel(games, games, teams)
    c = 1
    for i in range(0, len(a)):
        x = games.iloc[length + i]['expected']
        c *= x if a[i] == 1 else 1 - x
    return c


def findOdds(f, games):
    t1 = games.iloc[-1]['snapshot'][t1Name]
    t2 = games.iloc[-1]['snapshot'][t2Name]
    p = model.expectedWinRate(t1, t2)
    o = {}
    o['bo1'] = {}
    o['bo1']['win'] = p
    o['bo1']['lose'] = 1 - o['bo1']['win']

    results = {}
    for result in bo3s:
        key = wlCountKey(result)
        results[key] = 0 if key not in results else results[key]
        results[key] += f(p, result)
    o['bo3'] = results
    o['bo3']['win'] = results['w2x0'] + results['w2x1']
    o['bo3']['lose'] = 1 - o['bo3']['win']
    o['bo3']['g2'] = results['w2x0'] + results['w0x2']
    o['bo3']['g3'] = results['w2x1'] + results['w1x2']
    o['bo3']['w1'] = results['w1x2'] + results['w2x1'] + results['w2x0']
    o['bo3']['w1n'] = results['w2x1'] + results['w1x2'] + results['w0x2']

    results = {}
    for result in bo5s:
        key = wlCountKey(result)
        results[key] = 0 if key not in results else results[key]
        results[key] += f(p, result)
    o['bo5'] = results
    o['bo5']['win'] = results['w3x0'] + results['w3x1'] + results['w3x2']
    o['bo5']['lose'] = 1 - o['bo5']['win']
    o['bo5']['g3'] = results['w3x0'] + results['w0x3']
    o['bo5']['g4'] = results['w3x1'] + results['w1x3']
    o['bo5']['g5'] = results['w3x2'] + results['w2x3']

    return o


rates = {
    'static': findOdds(staticFn, games),
    'dynamic': findOdds(dynamicFn, games)
}


def out(t, p, q):
    print('{:20s} {:12.2f} {:12.2f}'.format(t, p * 100, q * 100))


print('{:20s} {:12s} {:12s}'.format('Type', 'Static (%)', 'Dynamic (%)'))
out(t1ShortName + ' bo1 win', rates['static']['bo1']['win'], rates['dynamic']['bo1']['win'])
out(t2ShortName + ' bo1 win', rates['static']['bo1']['lose'], rates['dynamic']['bo1']['lose'])
out(t1ShortName + ' bo3 win', rates['static']['bo3']['win'], rates['dynamic']['bo3']['win'])
out(t2ShortName + ' bo3 win', rates['static']['bo3']['lose'], rates['dynamic']['bo3']['lose'])
out(t1ShortName + ' bo3 win 2-0', rates['static']['bo3']['w2x0'], rates['dynamic']['bo3']['w2x0'])
out(t1ShortName + ' bo3 win 2-1', rates['static']['bo3']['w2x1'], rates['dynamic']['bo3']['w2x1'])
out(t2ShortName + ' bo3 win 2-0', rates['static']['bo3']['w0x2'], rates['dynamic']['bo3']['w0x2'])
out(t2ShortName + ' bo3 win 2-1', rates['static']['bo3']['w1x2'], rates['dynamic']['bo3']['w1x2'])
out(t1ShortName + ' bo3 win 1 game', rates['static']['bo3']['w1'], rates['dynamic']['bo3']['w1'])
out(t2ShortName + ' bo3 win 1 game', rates['static']['bo3']['w1n'], rates['dynamic']['bo3']['w1n'])
out('bo3 last 2 games', rates['static']['bo3']['g2'], rates['dynamic']['bo3']['g2'])
out('bo3 last 3 games', rates['static']['bo3']['g3'], rates['dynamic']['bo3']['g3'])
out(t1ShortName + ' bo5 win', rates['static']['bo5']['win'], rates['dynamic']['bo5']['win'])
out(t2ShortName + ' bo5 win', rates['static']['bo5']['lose'], rates['dynamic']['bo5']['lose'])
out(t1ShortName + ' bo5 win 3-0', rates['static']['bo5']['w3x0'], rates['dynamic']['bo5']['w3x0'])
out(t1ShortName + ' bo5 win 3-1', rates['static']['bo5']['w3x1'], rates['dynamic']['bo5']['w3x1'])
out(t1ShortName + ' bo5 win 3-2', rates['static']['bo5']['w3x2'], rates['dynamic']['bo5']['w3x2'])
out(t2ShortName + ' bo5 win 3-0', rates['static']['bo5']['w0x3'], rates['dynamic']['bo5']['w0x3'])
out(t2ShortName + ' bo5 win 3-1', rates['static']['bo5']['w1x3'], rates['dynamic']['bo5']['w1x3'])
out(t2ShortName + ' bo5 win 3-2', rates['static']['bo5']['w2x3'], rates['dynamic']['bo5']['w2x3'])
out('bo5 last 3 games', rates['static']['bo5']['g3'], rates['dynamic']['bo5']['g3'])
out('bo5 last 4 games', rates['static']['bo5']['g4'], rates['dynamic']['bo5']['g4'])
out('bo5 last 5 games', rates['static']['bo5']['g5'], rates['dynamic']['bo5']['g5'])
