from trueskill import Rating, quality_1vs1, rate_1vs1
from pyquery import PyQuery as pq
from pprint import pprint
import _sqlite3 as sql

alice, bob = Rating(25), Rating(25)  # assign Alice and Bob's ratings
if quality_1vs1(alice, bob) < 0.50:
    print('This match seems to be not so fair')
alice, bob = rate_1vs1(alice, bob)  # update the ratings after the match
