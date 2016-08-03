import _sqlite3 as sql
import trueSkill as ts
import pandas as pd

conn = sql.connect('matches/matchess.db')
conn.row_factory = sql.Row
db = conn.cursor()
ms = list(map(dict, list(db.execute("select * from matches where league='eu16br' order by id"))))
conn.commit()
conn.close()

for m in ms:
    print(m["result"])
    ts.Rating


d = pd.DataFrame(rs)
print(d["date"][181])
