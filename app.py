#!/usr/bin/env python
import eventlet
eventlet.monkey_patch()

import re
import itertools
import numpy as np
import StringIO
import logging

from time import sleep
import pandas as pd
from pandas import *
from link import *
from json import dumps as json_dumps

import bottle
from bottle import *
from beaker.middleware import SessionMiddleware
from beaker.cache import CacheManager
from beaker.util import parse_cache_config_options


## Config # #

logging.basicConfig(level=logging.DEBUG)

app = bottle.app()


cache_opts = {
    'cache.type': 'dbm',
    'cache.data_dir': '/tmp/cache/data',
    'cache.lock_dir': '/tmp/cache/lock'
}

cache = CacheManager(**parse_cache_config_options(cache_opts))
logging.basicConfig(level=logging.DEBUG)

#lnk.fresh(config_file="link.config")
#tbl_names = lnk.prod.dbs.ax_pg.tables()

sturl = "http://pencil.actionx.com.s3-website-us-east-1.amazonaws.com"

##  Bottle methods  # #

'''
@cache.cache('campaigns', expire=14400)
def index():
    # grab the data from postgres
    rows = lnk.prod.dbs.ax_pg.select_dataframe( query.ys_campaign_list )
    l = rows.to_records(index=False).tolist()
    l = map(lambda x: x[1] + '~' + str(x[0]), l)
    return template('nibs/ys_index.nib', nitems=len(l), items='["'+'","'.join(l) +'"]' , sturl=sturl  ) 
'''
@route('/sorry_page')
def sorry():
    return "Sorry, you can't do that."

@route('/static/<p:path>')
def server_static(p):
    return static_file(p, 
             root='static/')


@route('/edgeroll')
def render():
    return template("nibs/edgeroll.nib", sturl=sturl, campaign="brightroll", cname="brightroll")


@route('/fetch_data')
def json():
    # {'columns':cols, 'records': rows, 'matrix': mat, 'where':where  }
    return fetch( )


@cache.cache('fetch', expire=14400)
def fetch( filename='static/sup_used.csv' ):
    #db_lnk = lnk.prod.dbs.ax_pg
    edges = pd.read_csv("static/supply_demand_utilization_1.csv")
    supply_possible = pd.read_csv("static/supply_possible_utilization_1.csv")
    supply_cats = pd.read_csv("static/supply_categorization.csv")

    edges['perf_sum']=edges['imps']*edges['performance']
    supply_agg = edges.groupby(['date','supply_id']).agg({'imps':'sum','perf_sum':'sum','demand_id': lambda x: x.count()})
    supply_agg.columns = ['del_imps', 'edges','avg_perf']
    supply_agg['avg_perf'] = supply_agg['avg_perf']/supply_agg['del_imps']
    supply_agg = pd.merge( supply_possible, supply_agg, how="left", left_on=['date','supply_id'], right_index=True )
    supply_agg = pd.merge( supply_agg, supply_cats, how="left" )
    supply_agg['frac_util'] = supply_agg['del_imps']/supply_agg['total_possible_utilization']
    oh = StringIO.StringIO()
    logging.info("done fetching")
    supply_agg.to_csv(oh, index=False)
    return oh.getvalue()



## Main Events  # #
## gratuitous comment ##
pool = eventlet.GreenPool(2)

def cache_all():
    top = lnk.prod.dbs.ax_pg.select_dataframe( query.ys_top_campaigns )
    logging.info( "starting cache layer" )
    qrys = top["campaign"].map( lambda x: 
                                    query.ys_counts %  " and campaign = '%s' " % str(x) )
    for q in qrys:
        pool.spawn_n( fetch, q ) 

def main():
    #pool.spawn( cache_all )
    bottle.run(host='0.0.0.0', port=os.environ.get('PORT', 5001), reloader=True )

if __name__ == "__main__":
    main()

