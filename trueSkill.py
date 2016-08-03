import _sqlite3 as sql
import trueskill as ts
import pandas as pd

conn = sql.connect('matches/matchess.db')
conn.row_factory = sql.Row
db = conn.cursor()
ms = list(map(dict, list(db.execute("select * from matches where league='na16br' order by id"))))
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


ts.setup(draw_probability=0)
for m in ms:
    (t1p1, t1p2, t1p3, t1p4, t1p5), (t2p1, t2p2, t2p3, t2p4, t2p5) = ts.rate(
        [
            (getPlayerRatingAndIncrementGame(m["t1p1"])
             , getPlayerRatingAndIncrementGame(m["t1p2"])
             , getPlayerRatingAndIncrementGame(m["t1p3"])
             , getPlayerRatingAndIncrementGame(m["t1p4"])
             , getPlayerRatingAndIncrementGame(m["t1p5"])
             )
            , (getPlayerRatingAndIncrementGame(m["t2p1"])
               , getPlayerRatingAndIncrementGame(m["t2p2"])
               , getPlayerRatingAndIncrementGame(m["t2p3"])
               , getPlayerRatingAndIncrementGame(m["t2p4"])
               , getPlayerRatingAndIncrementGame(m["t2p5"])
               )
        ]
        , [1 - m["result"], m["result"]]
    )
    updatePlayerRatings([
        (t1p1, m["t1p1"], m["t1"]), (t1p2, m["t1p2"], m["t1"]), (t1p3, m["t1p3"], m["t1"]), (t1p4, m["t1p4"], m["t1"]), (t1p5, m["t1p5"], m["t1"])
        , (t2p1, m["t2p1"], m["t2"]), (t2p2, m["t2p2"], m["t2"]), (t2p3, m["t2p3"], m["t2"]), (t2p4, m["t2p4"], m["t2"]), (t2p5, m["t2p5"], m["t2"])])

i = 1
print("{:3}  {:15}  {:25}  {:5}  {:8}  {:8}".format("", "Player", "Team", "Games", "Rating", "SD"))
for p in sorted(players.values(), key=lambda x: x["rating"].mu, reverse=True):
    print("{:3d}  {:15.15}  {:25.25}  {:<5d}  {:<8.4f}  {:<8.4f}".format(i, p["name"], p["team"], p["game"], p["rating"].mu, p["rating"].sigma))
    i+=1
print()

i = 1
print("{:15}  {:25}  {:5}  {:8}  {:8}".format("", "Player", "Team", "Games", "Rating", "SD"))
for p in sorted(players.values(), key=lambda x: [x["team"], -x["rating"].mu]):
    print("{:3d}  {:15.15}  {:25.25}  {:<5d}  {:<8.4f}  {:<8.4f}".format(i, p["name"], p["team"], p["game"], p["rating"].mu, p["rating"].sigma))
    i+=1
print()
