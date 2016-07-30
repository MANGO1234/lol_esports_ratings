import json
import sys
from pyquery import PyQuery as pq
import _sqlite3 as sql
from pprint import pprint

with open('matches/leagues.json') as data_file:
    data = json.load(data_file)

key = sys.argv[1]
if key in data["tournaments"]:
    ts = [key]
elif key in data["combined"]:
    ts = data["combined"][key]

for t in ts:
    v = data["tournaments"][t]
    pprint("Getting " + t)
    d = pq(url=v["link"])
    data = d('.wikitable tr')
    pprint(t)

conn = sql.connect('matches/matchess.db')
c = conn.cursor()
c.execute('''create table if not exists matches
             (id integer primary key autoincrement, date text, t1 text, t2 text, result int, patch text, link text
             , t1b1 text, t1b2 text, t1b3 text
             , t2b1 text, t2b2 text, t2b3 text
             , t1p1 text, t1p2 text, t1p3 text, t1p4 text, t1p5 text
             , t1c1 text, t1c2 text, t1c3 text, t1c4 text, t1c5 text
             , t2p1 text, t2p2 text, t2p3 text, t2p4 text, t2p5 text
             , t2c1 text, t2c2 text, t2c3 text, t2c4 text, t2c5 text
             )''')
conn.commit()
conn.close()