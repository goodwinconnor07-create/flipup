#!/usr/bin/env python3
"""Authenticated remote status/pause/resume; token read from environment, never URL."""
import argparse,json
from scroll_worker import call
from coach_client import Coach
ap=argparse.ArgumentParser();ap.add_argument('action',choices=['status','pause','resume']);a=ap.parse_args()
c=Coach();print(json.dumps(call(c,'/status') if a.action=='status' else call(c,'/control',{'paused':a.action=='pause'}),indent=2))
