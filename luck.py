import _sqlite3 as sql
import json
import sys

conn = sql.connect('matches/matches.db')
conn.row_factory = sql.Row
db = conn.cursor()

with open('matches/leagues.json') as data_file:
    config = json.load(data_file)

key = sys.argv[1]
if key in config["tournaments"]:
    teams = [key]
elif key in config["combined"]:
    teams = config["combined"][key]
elif key == 'all':
    teams = list(config['tournaments'].keys())

ms = list(map(dict, list(db.execute("select * from matches where league in ('" + "','".join(teams) + "') order by id"))))
conn.commit()
conn.close()

teams = {}


def getTeam(n):
    if not n in teams:
        teams[n] = {
            "name": n,
            "game": 0,
            "wins": 0,
        }
    return teams[n]


def updateTeam(n, rs):
    getTeam(n)
    teams[n]["game"] += 1
    if rs == 1:
        teams[n]["wins"] += 1


for m in ms:
    updateTeam(m["t1"], m["result"])
    updateTeam(m["t2"], 1 - m["result"])

i = 1
print("{:3}  {:25}  {:5}  {:5}  {:5}".format("", "Team", "Games", "Wins", "%"))
tss = sorted(teams.values(), key=lambda x: x["game"], reverse=True)
for p in tss:
    print("{:3d}  {:25.25}  {:<5d}  {:<5d}  {:<8.4f}".format(i, p["name"], p["game"], p["wins"], p["wins"] / p["game"]))
    i += 1
print()

s = 0
m = 0
i = 0
c = 0
for t in tss:
    i += 1
    m += t["game"]
    c += (t["wins"] / t["game"])
c /= i
for t in tss:
    s += ((t["wins"] / t["game"]) - c) * ((t["wins"] / t["game"]) - c)
m /= 2
print(c)
print((0.25 / m))
print((s / i))
print((0.25 / m) / (s / i))
