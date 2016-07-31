import json
import sys
from pyquery import PyQuery as pq
import _sqlite3 as sql
from pprint import pprint

with open('matches/leagues.json') as data_file:
    config = json.load(data_file)

key = sys.argv[1]
if key in config["tournaments"]:
    ts = [key]
elif key in config["combined"]:
    ts = config["combined"][key]


conn = sql.connect('matches/matchess.db')
db = conn.cursor()

matches = []
for league in ts:
    pprint(config["tournaments"])
    v = config["tournaments"][league]
    pprint("Getting " + league)
    d = pq(url=v["link"])
    data = d('.wikitable tr')
    for i in range(2, data.length - 1):
        c = d(data[i]).find('td')
        date = d(c[0]).text()
        patch = d(c[1]).text()[0:-1]
        t1 = d(c[2]).find('a').text()
        t2 = d(c[3]).find('a').text()
        result = d(c[4]).text()
        if result == 'red':
            result = 0
        elif result == 'blue':
            result = 1
        else:
            raise Exception('Unknown result: ' + result)
        bans = d(c[5]).text().split(', ')
        t1b1 = bans[0] if len(bans) > 0  else''
        t1b2 = bans[1] if len(bans) > 1  else''
        t1b3 = bans[2] if len(bans) > 2  else''
        bans = d(c[6]).text().split(', ')
        t2b1 = bans[0] if len(bans) > 0  else''
        t2b2 = bans[1] if len(bans) > 1  else''
        t2b3 = bans[2] if len(bans) > 2  else''
        picks = d(c[7]).text().split(', ')
        t1c1 = picks[0]
        t1c2 = picks[1]
        t1c3 = picks[2]
        t1c4 = picks[3]
        t1c5 = picks[4]
        picks = d(c[8]).text().split(', ')
        t2c1 = picks[0]
        t2c2 = picks[1]
        t2c3 = picks[2]
        t2c4 = picks[3]
        t2c5 = picks[4]
        players = d(c[9]).find('a').map(lambda i, el: d(el).text())
        t1p1 = players[0]
        t1p2 = players[1]
        t1p3 = players[2]
        t1p4 = players[3]
        t1p5 = players[4]
        players = d(c[10]).find('a').map(lambda i, el: d(el).text())
        t2p1 = players[0]
        t2p2 = players[1]
        t2p3 = players[2]
        t2p4 = players[3]
        t2p5 = players[4]
        link = d(c[-2]).find('a').text()
        matches.append((
            league, data.length - 1 - i, date, patch, t1, t2, result, link,
            t1b1, t1b2, t1b3,
            t2b1, t2b2, t2b3,
            t1p1, t1p2, t1p3, t1p4, t1p5,
            t2p1, t2p2, t2p3, t2p4, t2p5,
            t1c1, t1c2, t1c3, t1c4, t1c5,
            t2c1, t2c2, t2c3, t2c4, t2c5
        ))

pprint(matches)

db.execute('''create table if not exists matches
             (
             league text, id int, date text, patch text, t1 text, t2 text, result int, link text
             , t1b1 text, t1b2 text, t1b3 text
             , t2b1 text, t2b2 text, t2b3 text
             , t1p1 text, t1p2 text, t1p3 text, t1p4 text, t1p5 text
             , t2p1 text, t2p2 text, t2p3 text, t2p4 text, t2p5 text
             , t1c1 text, t1c2 text, t1c3 text, t1c4 text, t1c5 text
             , t2c1 text, t2c2 text, t2c3 text, t2c4 text, t2c5 text
             , primary key (id, league)
             )''')
conn.commit()
conn.close()