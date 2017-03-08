import sqlite3 as sql
import sys
import json
import time

import pandas as pd

with open('matches/leagues.json') as data_file:
    config = json.load(data_file)

with open('matches/names.json') as data_file:
    namesTranslate = json.load(data_file)

names = {}
for k, v in namesTranslate.items():
    names[v] = k

key = sys.argv[1]

if key == 'lspl':
    league = 'lspl17ar'
    matches = [
        ("ING", "SAT", 0, "2017-03-07"),
        ("SAT", "ING", 1, "2017-03-07"),
        ("LD", "RY", 0, "2017-03-07"),
        ("RY", "LD", 1, "2017-03-07"),
        ("DAN", "YM", 1, "2017-03-07"),
        ("DAN", "YM", 0, "2017-03-07"),
        ("YM", "DAN", 1, "2017-03-07")
    ]

with sql.connect('matches/matches.db') as con:
    c = con.cursor()
    c.execute('select max(id) from matches where league="' + league + '"')
    idMax = c.fetchall()[0][0] + 1
    for (t1, t2, r, d) in matches:
        c.execute('INSERT INTO matches VALUES (' + (37 * '?,') + '?)', (
            league, idMax, d, '', names[t1.upper()], names[t2.upper()], r, '',
            '', '', '', '', '',
            '', '', '', '', '',
            '', '', '', '', '',
            '', '', '', '', '',
            '', '', '', '', '',
            '', '', '', '', ''
        ))
        idMax += 1
    con.commit()
