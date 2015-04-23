import networkx as nx
import tangelo
from networkx.readwrite import json_graph
import pandas as pd
import numpy as np
import json
import requests

def run(query):
	g=nx.Graph()
	url="http://ec2-54-167-240-67.compute-1.amazonaws.com:9200/wiki/_search?q="+query

	r=requests.get(url)
	data=r.json()
	list=[]
	for hit in data['hits']['hits']:
		r=requests.get('http://ec2-54-167-240-67.compute-1.amazonaws.com:9200/wiki/page/'+hit['_id']+'/_percolate')
		payload={
		  "query": {
		    "match": {
		      "id":hit['_id']
		    }
		  }
		}
		tags=map(lambda x: x['_id'],r.json()['matches'])
		if 'fraud' in tags:
			g.add_node(hit['_id'],type="entity",category="fraud")
		else:
			g.add_node(hit['_id'],type="entity",category="document")
		r2=requests.post('http://ec2-54-167-240-67.compute-1.amazonaws.com:9200/tmp/mitie/_search',data=json.dumps(payload))
		data2=r2.json()
		for hit2 in data2['hits']['hits']:
			for entity in hit2['_source']['ents']:
				g.add_node(entity['entity'],category=entity['tag'],type="entity")
				g.add_edge(hit['_id'],entity['entity'])
		#g['adj']=g.adj
		js=json_graph.node_link_data(g)
		js['adj']=g.adj


	return json.dumps(js)

