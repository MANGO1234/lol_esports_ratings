import json
import sys
import requests
import re
import time
from pyquery import PyQuery as pq
import _sqlite3 as sql
from os.path import isfile

with open('matches/leagues.json') as data_file:
    config = json.load(data_file)

key = sys.argv[1]
if key in config["tournaments"]:
    ts = [key]
elif key in config["combined"]:
    ts = config["combined"][key]
elif key == 'all':
    ts = list(config['tournaments'].keys())

conn = sql.connect('matches/matches.db')
conn.row_factory = sql.Row
db = conn.cursor()

db.execute('''create table if not exists matches
             (
             league text, id int, date text, patch text, t1 text, t2 text, result int, link text
             , t1b1 text, t1b2 text, t1b3 text, t1b4 text, t1b5 text
             , t2b1 text, t2b2 text, t2b3 text, t2b4 text, t2b5 text
             , t1p1 text, t1p2 text, t1p3 text, t1p4 text, t1p5 text
             , t2p1 text, t2p2 text, t2p3 text, t2p4 text, t2p5 text
             , t1c1 text, t1c2 text, t1c3 text, t1c4 text, t1c5 text
             , t2c1 text, t2c2 text, t2c3 text, t2c4 text, t2c5 text
             , primary key (id, league)
             )''')

db.execute('''create table if not exists details
             (
             league text, id int, data text
             , primary key (id, league)
             )''')


if not (len(sys.argv) > 2 and sys.argv[2] == "-d"):
    # retrieve basic match data from wiki
    matches = []
    usedTs = []
    for league in ts:
        info = config["tournaments"][league]
        if info["finished"] and len(list(db.execute("select * from matches where league=? order by id", (league,)))) > 0:
            print("Skipping " + league + ". Already retrieved.")
            continue
        usedTs.append(league)

        print('retrieving ' + league)
        text = ""
        if isfile('matches/raw/' + league + '.html'):
            print('using cache')
            with open('matches/raw/' + league + '.html', 'r') as f:
                text = f.read()
        else:
            d = requests.get(info["link"])
            text = d.text
            if info["finished"]:
                with open('matches/raw/' + league + '.html', 'w') as f:
                    f.write(text)

        lms17arMissing = [
            (1, '2017-01-21', 'ahq e-Sports Club', 'Flash Wolves', 1),
            (2, '2017-01-21', 'Flash Wolves', 'ahq e-Sports Club', 1),
            (3, '2017-01-21', 'ahq e-Sports Club', 'Flash Wolves', 0),
            (4, '2017-01-21', 'Hong Kong Esports', 'Fireball', 0),
            (5, '2017-01-21', 'Fireball', 'Hong Kong Esports', 0),
            (6, '2017-01-21', 'Hong Kong Esports', 'Fireball', 1),
            (7, '2017-01-22', 'Machi E-Sports', 'J Team', 1),
            (8, '2017-01-22', 'J Team', 'Machi E-Sports', 1),
            (9, '2017-01-22', 'Machi E-Sports', 'J Team', 0),
            (10, '2017-01-22', 'eXtreme Gamers', 'Wayi Spider', 0),
            (11, '2017-01-22', 'Wayi Spider', 'eXtreme Gamers', 0),
            (12, '2017-01-22', 'eXtreme Gamers', 'Wayi Spider', 1),
            (13, '2017-02-03', 'Flash Wolves', 'J Team', 1),
            (14, '2017-02-03', 'J Team', 'Flash Wolves', 0),
            (15, '2017-02-03', 'Wayi Spider', 'Hong Kong Esports', 0),
            (16, '2017-02-03', 'Hong Kong Esports', 'Wayi Spider', 1),
            (17, '2017-02-04', 'Machi E-Sports', 'Flash Wolves', 0),
            (18, '2017-02-04', 'Flash Wolves', 'Machi E-Sports', 1),
            (19, '2017-02-04', 'eXtreme Gamers', 'J Team', 0),
            (20, '2017-02-04', 'J Team', 'eXtreme Gamers', 1),
            (21, '2017-02-05', 'Fireball', 'eXtreme Gamers', 1),
            (22, '2017-02-05', 'eXtreme Gamers', 'Fireball', 0),
            (23, '2017-02-05', 'ahq e-Sports Club', 'Machi E-Sports', 1),
            (24, '2017-02-05', 'Machi E-Sports', 'ahq e-Sports Club', 0)
        ]
        if league == 'lms17ar':
            for (id, date, t1, t2, result) in lms17arMissing:
                matches.append(('lms17ar', id, date, '7.1', t1, t2, result, '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''))

        na17brMissing = [
            (53, '2017-06-16', 'Team EnVyUs', 'Echo Fox', 0),
            (54, '2017-06-16', 'Echo Fox', 'Team EnVyUs', 1),
            (55, '2017-06-17', 'Team Liquid', 'Team SoloMid', 0),
            (56, '2017-06-17', 'Team SoloMid', 'Team Liquid', 1),
            (57, '2017-06-17', 'Immortals', 'Cloud9', 0),
            (58, '2017-06-17', 'Cloud9', 'Immortals', 1),
            (59, '2017-06-17', 'Immortals', 'Cloud9', 1),
            (60, '2017-06-17', 'FlyQuest', 'Counter Logic Gaming', 0),
            (61, '2017-06-17', 'Counter Logic Gaming', 'FlyQuest', 0),
            (62, '2017-06-17', 'FlyQuest', 'Counter Logic Gaming', 0),
            (63, '2017-06-17', 'Phoenix1', 'Team Dignitas', 0),
            (64, '2017-06-17', 'Team Dignitas', 'Phoenix1', 0),
            (65, '2017-06-17', 'Phoenix1', 'Team Dignitas', 0),
            (66, '2017-06-18', 'Team EnVyUs', 'Team SoloMid', 0),
            (67, '2017-06-18', 'Team SoloMid', 'Team EnVyUs', 1),
            (68, '2017-06-18', 'Phoenix1', 'Counter Logic Gaming', 0),
            (69, '2017-06-18', 'Counter Logic Gaming', 'Phoenix1', 0),
            (70, '2017-06-18', 'Phoenix1', 'Counter Logic Gaming', 0),
            (71, '2017-06-18', 'FlyQuest', 'Cloud9', 0),
            (72, '2017-06-18', 'Cloud9', 'FlyQuest', 1),
            (73, '2017-06-18', 'Team Dignitas', 'Echo Fox', 1),
            (74, '2017-06-18', 'Echo Fox', 'Team Dignitas', 1),
            (75, '2017-06-18', 'Team Dignitas', 'Echo Fox', 1),

            (76, '2017-06-23', 'Immortals', 'Counter Logic Gaming', 1),
            (77, '2017-06-23', 'Counter Logic Gaming', 'Immortals', 0),
            (78, '2017-06-23', 'Echo Fox', 'Phoenix1', 0),
            (79, '2017-06-23', 'Phoenix1', 'Echo Fox', 1),
            (80, '2017-06-24', 'Team SoloMid', 'FlyQuest', 1),
            (81, '2017-06-24', 'FlyQuest', 'Team SoloMid', 0),
            (82, '2017-06-24', 'Counter Logic Gaming', 'Team EnVyUs', 1),
            (83, '2017-06-24', 'Team EnVyUs', 'Counter Logic Gaming', 1),
            (84, '2017-06-24', 'Counter Logic Gaming', 'Team EnVyUs', 1),
            (85, '2017-06-24', 'Cloud9', 'Team Liquid', 1),
            (86, '2017-06-24', 'Team Liquid', 'Cloud9', 0),
            (87, '2017-06-24', 'Immortals', 'Team Dignitas', 0),
            (88, '2017-06-24', 'Team Dignitas', 'Immortals', 0),
            (89, '2017-06-24', 'Immortals', 'Team Dignitas', 1),
            (90, '2017-06-25', 'Team SoloMid', 'Echo Fox', 1),
            (91, '2017-06-25', 'Echo Fox', 'Team SoloMid', 0),
            (92, '2017-06-25', 'Team Liquid', 'Phoenix1', 1),
            (93, '2017-06-25', 'Phoenix1', 'Team Liquid', 1),
            (94, '2017-06-25', 'Team Liquid', 'Phoenix1', 1),
            (95, '2017-06-25', 'Cloud9', 'Team Dignitas', 0),
            (96, '2017-06-25', 'Team Dignitas', 'Cloud9', 0),
            (97, '2017-06-25', 'Cloud9', 'Team Dignitas', 1),
            (98, '2017-06-25', 'FlyQuest', 'Team EnVyUs', 1),
            (99, '2017-06-25', 'Team EnVyUs', 'FlyQuest', 0),
            (100, '2017-06-25', 'FlyQuest', 'Team EnVyUs', 0),

            (101, '2017-06-30', 'Cloud9', 'Team SoloMid', 0),
            (102, '2017-06-30', 'Team SoloMid', 'Cloud9', 0),
            (103, '2017-06-30', 'Cloud9', 'Team SoloMid', 1),
            (104, '2017-06-30', 'Phoenix1', 'Team EnVyUs', 1),
            (105, '2017-06-30', 'Team EnVyUs', 'Phoenix1', 0),
            (106, '2017-06-30', 'Phoenix1', 'Team EnVyUs', 1),
            (107, '2017-07-01', 'Team SoloMid', 'Immortals', 1),
            (108, '2017-07-01', 'Immortals', 'Team SoloMid', 0),
            (109, '2017-07-01', 'Counter Logic Gaming', 'Cloud9', 1),
            (110, '2017-07-01', 'Cloud9', 'Counter Logic Gaming', 1),
            (111, '2017-07-01', 'Counter Logic Gaming', 'Cloud9', 1),
            (112, '2017-07-01', 'Team Dignitas', 'FlyQuest', 0),
            (113, '2017-07-01', 'FlyQuest', 'Team Dignitas', 0),
            (114, '2017-07-01', 'Team Dignitas', 'FlyQuest', 0),
            (115, '2017-07-01', 'Echo Fox', 'Team Liquid', 1),
            (116, '2017-07-01', 'Team Liquid', 'Echo Fox', 1),
            (117, '2017-07-01', 'Echo Fox', 'Team Liquid', 1),
            (118, '2017-07-02', 'Phoenix1', 'Immortals', 0),
            (119, '2017-07-02', 'Immortals', 'Phoenix1', 0),
            (120, '2017-07-02', 'Phoenix1', 'Immortals', 1),
            (121, '2017-07-02', 'FlyQuest', 'Echo Fox', 0),
            (122, '2017-07-02', 'Echo Fox', 'FlyQuest', 0),
            (123, '2017-07-02', 'FlyQuest', 'Echo Fox', 1),
            (124, '2017-07-02', 'Team EnVyUs', 'Team Dignitas', 1),
            (125, '2017-07-02', 'Team Dignitas', 'Team EnVyUs', 1),
            (126, '2017-07-02', 'Team EnVyUs', 'Team Dignitas', 1),
            (127, '2017-07-02', 'Team Liquid', 'Counter Logic Gaming', 0),
            (128, '2017-07-02', 'Counter Logic Gaming', 'Team Liquid', 1),

            (129, '2017-07-14', 'Counter Logic Gaming', 'FlyQuest', 1),
            (130, '2017-07-14', 'FlyQuest', 'Counter Logic Gaming', 0),
            (131, '2017-07-14', 'Immortals', 'Echo Fox', 1),
            (132, '2017-07-14', 'Echo Fox', 'Immortals', 0),
            (133, '2017-07-15', 'Team SoloMid', 'Phoenix1', 1),
            (134, '2017-07-15', 'Phoenix1', 'Team SoloMid', 0),
            (135, '2017-07-15', 'Counter Logic Gaming', 'Team Dignitas', 0),
            (136, '2017-07-15', 'Team Dignitas', 'Counter Logic Gaming', 1),
            (137, '2017-07-15', 'Cloud9', 'Team EnVyUs', 0),
            (138, '2017-07-15', 'Team EnVyUs', 'Cloud9', 1),
            (139, '2017-07-15', 'Team Liquid', 'FlyQuest', 0),
            (140, '2017-07-15', 'FlyQuest', 'Team Liquid', 1),
            (141, '2017-07-16', 'Phoenix1', 'Immortals', 0),
            (142, '2017-07-16', 'Cloud9', 'Immortals', 1),
            (143, '2017-07-16', 'Immortals', 'Cloud9', 1),
            (144, '2017-07-16', 'Cloud9', 'Immortals', 0),
            (145, '2017-07-16', 'Team Dignitas', 'Phoenix1', 1),
            (146, '2017-07-16', 'Phoenix1', 'Team Dignitas', 1),
            (147, '2017-07-16', 'Team Dignitas', 'Phoenix1', 1),
            (148, '2017-07-16', 'Team SoloMid', 'Team Liquid', 1),
            (149, '2017-07-16', 'Team Liquid', 'Team SoloMid', 0),
            (150, '2017-07-16', 'Echo Fox', 'Team EnVyUs', 1),
            (151, '2017-07-16', 'Team EnVyUs', 'Echo Fox', 1),
            (152, '2017-07-16', 'Echo Fox', 'Team EnVyUs', 0),

            (153, '2017-07-21', 'Cloud9', 'Phoenix1', 1),
            (154, '2017-07-21', 'Phoenix1', 'Cloud9', 1),
            (155, '2017-07-21', 'Cloud9', 'Phoenix1', 1),
            (156, '2017-07-21', 'Team Liquid', 'Team EnVyUs', 1),
            (157, '2017-07-21', 'Team EnVyUs', 'Team Liquid', 1),
            (158, '2017-07-21', 'Team Liquid', 'Team EnVyUs', 1),
            (159, '2017-07-22', 'Team SoloMid', 'Team Dignitas', 0),
            (160, '2017-07-22', 'Team Dignitas', 'Team SoloMid', 1),
            (161, '2017-07-22', 'Counter Logic Gaming', 'Echo Fox', 1),
            (162, '2017-07-22', 'Echo Fox', 'Counter Logic Gaming', 0),
            (163, '2017-07-22', 'Phoenix1', 'Team Liquid', 0),
            (164, '2017-07-22', 'Team Liquid', 'Phoenix1', 1),
            (165, '2017-07-22', 'FlyQuest', 'Immortals', 1),
            (166, '2017-07-22', 'Immortals', 'FlyQuest', 1),
            (167, '2017-07-22', 'FlyQuest', 'Immortals', 0),
            (168, '2017-07-23', 'Team Dignitas', 'Cloud9', 1),
            (169, '2017-07-23', 'Cloud9', 'Team Dignitas', 1),
            (170, '2017-07-23', 'Team Dignitas', 'Cloud9', 0),
            (171, '2017-07-23', 'Echo Fox', 'Team SoloMid', 0),
            (172, '2017-07-23', 'Team SoloMid', 'Echo Fox', 0),
            (173, '2017-07-23', 'Echo Fox', 'Team SoloMid', 0),
            (174, '2017-07-23', 'Counter Logic Gaming', 'Immortals', 0),
            (175, '2017-07-23', 'Immortals', 'Counter Logic Gaming', 0),
            (176, '2017-07-23', 'Counter Logic Gaming', 'Immortals', 0),
            (177, '2017-07-23', 'Team EnVyUs', 'FlyQuest', 0),
            (178, '2017-07-23', 'FlyQuest', 'Team EnVyUs', 0),
            (179, '2017-07-23', 'Team EnVyUs', 'FlyQuest', 1),

            (180, '2017-07-28', 'Phoenix1', 'Echo Fox', 0),
            (181, '2017-07-28', 'Echo Fox', 'Phoenix1', 1),
            (182, '2017-07-28', 'Team Liquid', 'Immortals', 0),
            (183, '2017-07-28', 'Immortals', 'Team Liquid', 1),
            (184, '2017-07-29', 'Team EnVyUs', 'Counter Logic Gaming', 0),
            (185, '2017-07-29', 'Counter Logic Gaming', 'Team EnVyUs', 1),
            (186, '2017-07-29', 'FlyQuest', 'Team SoloMid', 0),
            (187, '2017-07-29', 'Team SoloMid', 'FlyQuest', 1),
            (188, '2017-07-29', 'Team Liquid', 'Cloud9', 1),
            (189, '2017-07-29', 'Cloud9', 'Team Liquid', 1),
            (190, '2017-07-29', 'Team Liquid', 'Cloud9', 0),
            (191, '2017-07-29', 'Team Dignitas', 'Immortals', 1),
            (192, '2017-07-29', 'Immortals', 'Team Dignitas', 1),
            (193, '2017-07-29', 'Team Dignitas', 'Immortals', 1),
            (194, '2017-07-30', 'Cloud9', 'FlyQuest', 1),
            (195, '2017-07-30', 'FlyQuest', 'Cloud9', 0),
            (196, '2017-07-30', 'Counter Logic Gaming', 'Phoenix1', 1),
            (197, '2017-07-30', 'Phoenix1', 'Counter Logic Gaming', 1),
            (198, '2017-07-30', 'Counter Logic Gaming', 'Phoenix1', 0),
            (199, '2017-07-30', 'Team SoloMid', 'Team EnVyUs', 1),
            (200, '2017-07-30', 'Team EnVyUs', 'Team SoloMid', 0),
            (201, '2017-07-30', 'Team SoloMid', 'Team EnVyUs', 1),
            (202, '2017-07-30', 'Echo Fox', 'Team Dignitas', 0),
            (203, '2017-07-30', 'Team Dignitas', 'Echo Fox', 0),
            (204, '2017-07-30', 'Echo Fox', 'Team Dignitas', 0),

            (205, '2017-08-04', 'Team EnVyUs', 'Immortals', 0),
            (206, '2017-08-04', 'Immortals', 'Team EnVyUs', 1),
            (207, '2017-08-04', 'Counter Logic Gaming', 'Team Dignitas', 1),
            (208, '2017-08-04', 'Team Dignitas', 'Counter Logic Gaming', 1),
            (209, '2017-08-04', 'Counter Logic Gaming', 'Team Dignitas', 1),
            (210, '2017-08-05', 'Team EnVyUs', 'Cloud9', 0),
            (211, '2017-08-05', 'Cloud9', 'Team EnVyUs', 1),
            (212, '2017-08-05', 'Phoenix1', 'Team SoloMid', 0),
            (213, '2017-08-05', 'Team SoloMid', 'Phoenix1', 1),
            (214, '2017-08-05', 'FlyQuest', 'Team Liquid', 1),
            (215, '2017-08-05', 'Team Liquid', 'FlyQuest', 1),
            (216, '2017-08-05', 'FlyQuest', 'Team Liquid', 1),
            (217, '2017-08-05', 'Echo Fox', 'Immortals', 0),
            (218, '2017-08-05', 'Immortals', 'Echo Fox', 1),
            (219, '2017-08-06', 'Cloud9', 'Echo Fox', 1),
            (220, '2017-08-06', 'Echo Fox', 'Cloud9', 0),
            (221, '2017-08-06', 'Team Liquid', 'Team Dignitas', 0),
            (222, '2017-08-06', 'Team Dignitas', 'Team Liquid', 0),
            (223, '2017-08-06', 'Team Liquid', 'Team Dignitas', 0),
            (224, '2017-08-06', 'Team SoloMid', 'Counter Logic Gaming', 1),
            (225, '2017-08-06', 'Counter Logic Gaming', 'Team SoloMid', 0),
            (226, '2017-08-06', 'FlyQuest', 'Phoenix1', 1),
            (227, '2017-08-06', 'Phoenix1', 'FlyQuest', 0)
        ]
        if league == 'na17br':
            for (id, date, t1, t2, result) in na17brMissing:
                matches.append(('na17br', id, date, '7.1', t1, t2, result, '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''))

        print('parsing ' + league)
        d = pq(text)
        data = d('.wikitable tr')
        for i in range(2, data.length - 1):
            c = d(data[i]).find('td')
            date = d(c[0]).text()
            patch = d(c[1]).text() if d(c[1]).text() != '-' else ''
            t1 = d(c[2]).find('a').text()
            if t1 == 'QG Reapers':
                t1 = 'Qiao Gu Reapers'
            t2 = d(c[3]).find('a').text()
            if t2 == 'QG Reapers':
                t2 = 'Qiao Gu Reapers'
            result = d(c[4]).text()
            if result == 'red':
                result = 0
            elif result == 'blue':
                result = 1
            else:
                raise Exception('Unknown result: ' + result)
            bans = d(c[5]).text().split(', ')
            t1b1 = bans[0] if len(bans) > 0 else''
            t1b2 = bans[1] if len(bans) > 1 else''
            t1b3 = bans[2] if len(bans) > 2 else''
            t1b4 = bans[3] if len(bans) > 3 else''
            t1b5 = bans[4] if len(bans) > 4 else''
            bans = d(c[6]).text().split(', ')
            t2b1 = bans[0] if len(bans) > 0 else''
            t2b2 = bans[1] if len(bans) > 1 else''
            t2b3 = bans[2] if len(bans) > 2 else''
            t2b4 = bans[3] if len(bans) > 3 else''
            t2b5 = bans[4] if len(bans) > 4 else''
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
            if league == 'na17br' and t2 == 'Team Immortals':
                t2 = 'Immortals'
            matches.append((
                league, data.length - 1 - i + (24 if league == 'lms17ar' else 0), date, patch, t1, t2, result, link,
                t1b1, t1b2, t1b3, t1b4, t1b5,
                t2b1, t2b2, t2b3, t2b4, t2b5,
                t1p1, t1p2, t1p3, t1p4, t1p5,
                t2p1, t2p2, t2p3, t2p4, t2p5,
                t1c1, t1c2, t1c3, t1c4, t1c5,
                t2c1, t2c2, t2c3, t2c4, t2c5
            ))

    db.execute('DELETE FROM matches WHERE league in ("' + '","'.join(usedTs) + '")')
    db.executemany('INSERT INTO matches VALUES (' + (37 * '?,') + '?)', matches)
else:
    # retrieve detailed match data from riot (no lpl yet)
    fetch = list(map(dict, list(db.execute('''
                        select m.league, m.id, m.link from matches m inner join (
                        select league, id from matches where league in ("''' + "\", \"".join(ts) + '''") except select league, id from details d order by league, id
                        ) m2 on m.league=m2.league and m.id=m2.id
                        '''))))
    for match in fetch:
        m = re.search(r"/([A-Za-z0-9]+)/([0-9]+)\?gameHash=([A-Za-z0-9]+)&", match["link"])
        if m:
            link = "https://acs.leagueoflegends.com/v1/stats/game/" + m.group(1) + "/" + m.group(2) + "?gameHash=" + m.group(3)
            r = requests.get(link)
            if r.status_code == 200:
                db.execute('INSERT INTO details VALUES (' + (2 * '?,') + '?)', (match["league"], match["id"], r.text))
                conn.commit()
                print("Retrieved ({:s}, {:d})".format(match["league"], match["id"]))
            else:
                print("Retrieve Error: ({:s}, {:d}): {:s}".format(match["league"], match["id"], link))
            # sleep 30 seconds on every link
            time.sleep(30)
        else:
            print("Not matched ({:s}, {:d}): {:s}".format(match["league"], match["id"], match["link"]))

conn.commit()
conn.close()
