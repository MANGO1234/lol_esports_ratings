import json
from trueskill import Rating, quality_1vs1, rate_1vs1
from pprint import pprint

with open('matches/na16b.json') as data_file:
    data = json.load(data_file)
pprint(data)

alice, bob = Rating(25), Rating(25)  # assign Alice and Bob's ratings
if quality_1vs1(alice, bob) < 0.50:
    print('This match seems to be not so fair')
alice, bob = rate_1vs1(alice, bob)  # update the ratings after the match