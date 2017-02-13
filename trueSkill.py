import _sqlite3 as sql
import json
import math
import sys

import trueskill as ts

with open('matches/leagues.json') as data_file:
    config = json.load(data_file)

key = sys.argv[1]
if key in config["tournaments"]:
    leagues = [key]
elif key in config["combined"]:
    leagues = config["combined"][key]
elif key == 'all':
    leagues = list(config['tournaments'].keys())

conn = sql.connect('matches/matches.db')
conn.row_factory = sql.Row
db = conn.cursor()
ms = list(map(dict, list(db.execute("select * from matches where league in ('" + "','".join(leagues) + "') order by date,id"))))
conn.commit()
conn.close()

players = {}


def getPlayer(n):
    if not n in players:
        players[n] = {
            "name": n,
            "rating": ts.Rating(),
            "game": 0
        }
    return players[n]


def getPlayerRatingAndIncrementGame(n):
    p = getPlayer(n)
    p["game"] += 1
    return p["rating"]


def updatePlayerRatings(rs):
    for (r, n, t) in rs:
        players[n]["rating"] = r
        players[n]["team"] = t


ts.setup(mu=1500, sigma=300, beta=200, draw_probability=0)
for m in ms:
    (t1p1, t1p2, t1p3, t1p4, t1p5), (t2p1, t2p2, t2p3, t2p4, t2p5) = ts.rate(
        [
            (getPlayerRatingAndIncrementGame(m["t1p1"]), getPlayerRatingAndIncrementGame(m["t1p2"]), getPlayerRatingAndIncrementGame(m["t1p3"]), getPlayerRatingAndIncrementGame(m["t1p4"]), getPlayerRatingAndIncrementGame(m["t1p5"])
             ), (getPlayerRatingAndIncrementGame(m["t2p1"]), getPlayerRatingAndIncrementGame(m["t2p2"]), getPlayerRatingAndIncrementGame(m["t2p3"]), getPlayerRatingAndIncrementGame(m["t2p4"]), getPlayerRatingAndIncrementGame(m["t2p5"])
                 )
        ], [1 - m["result"], m["result"]]
    )
    updatePlayerRatings([
        (t1p1, m["t1p1"], m["t1"]), (t1p2, m["t1p2"], m["t1"]), (t1p3, m["t1p3"], m["t1"]), (t1p4, m["t1p4"], m["t1"]), (t1p5, m["t1p5"], m["t1"]), (t2p1, m["t2p1"], m["t2"]), (t2p2, m["t2p2"], m["t2"]), (t2p3, m["t2p3"], m["t2"]), (t2p4, m["t2p4"], m["t2"]), (t2p5, m["t2p5"], m["t2"])])

i = 1
print("{:15}  {:25}  {:5}  {:8}  {:8}".format("", "Player", "Team", "Games", "Rating", "SD"))
for p in sorted(players.values(), key=lambda x: [x["team"], -x["rating"].mu]):
    print("{:3d}  {:15.15}  {:25.25}  {:<5d}  {:<8.4f}  {:<8.4f}".format(i, p["name"], p["team"], p["game"], p["rating"].mu, p["rating"].sigma))
    i += 1
print()

i = 1
print("{:3}  {:15}  {:25}  {:5}  {:8}  {:8}".format("", "Player", "Team", "Games", "Rating", "SD"))
for p in sorted(players.values(), key=lambda x: x["rating"].mu, reverse=True):
    print("{:3d}  {:15.15}  {:25.25}  {:<5d}  {:<8.4f}  {:<8.4f}".format(i, p["name"], p["team"], p["game"], p["rating"].mu, p["rating"].sigma))
    i += 1
print()

teams = {}


def getTeam(n):
    if not n in teams:
        teams[n] = {
            "name": n,
            "rating": ts.Rating(),
            "game": 0
        }
    return teams[n]


def getTeamRatingAndIncrementGame(n):
    p = getTeam(n)
    p["game"] += 1
    return p["rating"]


def getTeamRating(n):
    p = getTeam(n)
    return p["rating"]


def updateTeamRatings(rs):
    for (r, n) in rs:
        teams[n]["rating"] = r


tempTs = ts.TrueSkill()


def winRate(rA, rB):
    deltaMu = rA.mu - rB.mu
    sumSigma = rA.sigma**2 + rB.sigma**2
    denominator = math.sqrt(4 * (200 * 200) + sumSigma)
    return tempTs.cdf(deltaMu / denominator)

for m in ms:
    (t1,), (t2,) = ts.rate([(getTeamRatingAndIncrementGame(m["t1"]),), (getTeamRatingAndIncrementGame(m["t2"]),)], [1 - m["result"], m["result"]])
    updateTeamRatings([(t1, m["t1"]), (t2, m["t2"])])

i = 1
print("{:3}  {:25}  {:5}  {:8}  {:8}".format("", "Team", "Games", "Rating", "SD"))
tss = sorted(teams.values(), key=lambda x: x["rating"].mu, reverse=True)
for p in tss:
    print("{:3d}  {:25.25}  {:<5d}  {:<8.4f}  {:<8.4f}".format(i, p["name"], p["game"], p["rating"].mu, p["rating"].sigma))
    i += 1
print()

for t1 in tss:
    for t2 in tss:
        print("{:25.25}  {:25.25}  {:<8.2f}".format(t1["name"], t2["name"], winRate(t1["rating"], t2["rating"])))
