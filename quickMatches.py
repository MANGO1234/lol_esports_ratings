import sys

from data import getLeagues, getGames, getGamesWithDetails

key = sys.argv[1]

data = getGames(getLeagues(key))
allGames = data.getGames()
for (ix, game) in allGames.iterrows():
    print('{:<11s} {:<27s} {:<5s} {:<27s}'.format(game['date'], game['t1'], "1:0" if game['result'] == 1 else "0:1", game['t2']))
print("Blue Side Win Rate: " + str(len(allGames[allGames['result'] == 1]) / len(allGames)))

if len(sys.argv) > 2:
    with open('out/matches.txt', 'w') as f:
        j = 0
        for (i, games) in allGames.groupby('period'):
            for (ix, game) in games.iterrows():
                f.write('{:d},{:d},{:s},{:s},{:s}\n'.format(j, i, game['t1'], game['t2'], "1,0" if game['result'] == 1 else "0,1"))
            j += 1
