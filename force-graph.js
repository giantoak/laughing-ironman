//////////////////////////////////////////////////////////////////////
// A network graph with two types of nodes.
//
// Each node is expected to have a `type` and `category` variable.
// `category` is used to color the node when the `type` of the node
// matches the `type` set for the graph.
//
/////////////////////////////////////////////////////////////////////

function NetworkGraph() {
    var width = 400,
        height = 400,
        gravity = 0.05,
        linkDistance = 50,
        charge = -300,
        DEFAULT_ALPHA = 0.9,
        type = "",
        graph;
    
    //////////////////////////////////////////////////////////////////////
    // Public setter functions for parts of the graph that are customizable
    //////////////////////////////////////////////////////////////////////
    makeGraph.width = function(w) {
        width = w;
        return makeGraph;
    }
    makeGraph.height = function(h) {
        height = h;
        return makeGraph;
    }
    makeGraph.gravity = function(d) {
        gravity = d;
        return makeGraph;
    }
    makeGraph.linkDistance = function(d) {
        linkDistance = d;
        return makeGraph;
    }
    makeGraph.charge = function(d) {
        charge = d;
        return makeGraph;
    }
    makeGraph.alpha = function(d) {
        DEFAULT_ALPHA = d;
        return makeGraph;
    }

    // Unless type is set, no nodes will be colored.
    makeGraph.type = function(d) {
        type = d;
        return makeGraph;
    }
    
    //////////////////////////////////////////////////////////////////////
    // Functions that are not chainable
    //////////////////////////////////////////////////////////////////////
    makeGraph.getExport = function() {
        var dtemp=graph.links.map(
            function(x) {
                return {
                        's':x.source.id,
                        't':x.target.id,
                        'file':x.target.origin
                        }
            });
        var data = "text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dtemp));
        return data;
    }


    //////////////////////////////////////////////////////////////////////
    // Main constructor
    //////////////////////////////////////////////////////////////////////
    function makeGraph(svg) {
        
        svg.each(function (d, i) {
            graph = d;
        });
        
        var links = graph.links,
            nodes = graph.nodes,
            adj = graph.adj,
            ent_colors = d3.scale.category20();

        var force = d3.layout.force()
            .nodes(d3.values(nodes))
            .links(links)
            .size([width, height])
            .linkDistance(linkDistance)
            .gravity(gravity)
            .charge(charge)
            .on("tick", tick)
            .start();
            // Event handler for making nodes fixed on drag
            var node_drag = force.drag()
            .on("dragstart", dragstart)
            .on("drag", dragmove)
            .on("dragend", dragend);

        var drag_pos = {};
        function dragstart(d, i) {
            drag_pos.x = d.x;
            drag_pos.y = d.y;
            force.stop(); // stops the force auto positioning before you start dragging
        }

        function dragmove(d, i) {
            d.x += d3.event.dx;
            d.y += d3.event.dy; 
            tick(); // this is the key to make it work together with updating both px,py,x,y on d !
        }

        function dragend(d, i) {
            var dragged_distance = dist(drag_pos, d);
            console.log(dragged_distance);
            if (!d.fixed || dragged_distance > 3) {
                d3.select(this).style('stroke-width', '5px');
                d.fixed = true; 
            }
            else {
                d3.select(this).style('stroke-width', null);
                d.fixed = false;
            }
            tick();
            force.resume();
        }

        function dist(d1, d2) {
            return Math.abs(d1.x - d2.x) + Math.abs(d1.y - d2.y);
        }

        var path = svg.append("g").selectAll("path")
            .data(force.links())
            .enter().append("path")
            .attr("class", "link");

        var circle = svg.append("g").selectAll("circle")
            .data(force.nodes())
            .enter().append("circle")
            ////////////////////////////////////////////////
            // Different styling for documents vs. entities
            .attr("class", function (d) { return "node " + d.type; })
            ////////////////////////////////////////////////
            // Fill in colors based off type of entity (vs. single color documents)
            .style("fill", function(d) { 
                if(d.category == "fraud"){
                    return "red";
                }
                else{
                return d.type == type ? ent_colors(d.category) : "white";
                }
            })
            .style("opacity", DEFAULT_ALPHA)
            ////////////////////////////////////////////////
            // Size nodes based off the number of connections
            .attr("r", function(d) {
                var r = Object.keys(adj[d.id]).length + 3;
                return r; 
            })
            .call(node_drag)
            ////////////////////////////////////////////////
            // Event handler for when node is clicked
            .on("click", function(d) {
                console.log(d);
            })
            .on("mouseover", handle_mouseover)
            .on("mouseout", handle_mouseout);

        var text = svg.append("g").selectAll("text")
            .data(force.nodes())
            .enter().append("text")
            .attr("x", 8)
            .attr("y", "1em")
            .text(function(d) { 
                if (d.type == type) return d.id ;
            });

        function tick() {
            var r = 5;

            path.attr("d", linkArc);
            circle.attr("transform", transform);
            text.attr("transform", transform);
        }
        function transform(d) {
            return "translate(" + d.x + "," + d.y + ")";
        }


        function linkArc(d) {
            var dx = d.target.x - d.source.x,
            dy = d.target.y - d.source.y;
            return "M" + d.source.x + "," + d.source.y 
            + "L" + d.target.x + "," + d.target.y;
        }

        function handle_mouseover(node) {
            // neighbors of neighbors:
            // track number of shared links between neighbors of neighbors
            var neighbors = {},
            neighbor_max = 1;
            for (var x in adj[node.id]) {
                neighbors[x] = x in neighbors ? neighbors[x]+1 : 1;
                for (var y in adj[x]) {
                    if (y in neighbors && y != node.id){
                        neighbors[y] += 1;
                        neighbor_max = neighbors[y] > neighbor_max ? 
                        neighbors[y] : neighbor_max;
                    }
                    else
                        neighbors[y] = 1;
                }
            }
            neighbors[node.id] = neighbor_max;

            var delay = 100;
            circle.transition()
            .duration(delay)
            .style("opacity", function (d) {
                return (d.id in neighbors) ? neighbors[d.id]/neighbor_max + 0.1 : 0;
            });
            path.transition()
            .duration(delay)
            .style("stroke-width", function (d) {
                if (d.target.id in adj[node.id] || d.source.id in adj[node.id]) {
                    if (node === d.target || node === d.source)
                    {
                        return 3;
                    }
                    else {
                        return 1;
                    }
                }
                else {
                    return 0; 
                }
            })
            .style("stroke-dasharray", function(d) {
                if (d.target.id in adj[node.id] || d.source.id in adj[node.id]) {
                }
            })
            ;

            text.transition()
            .duration(delay)
            .style("opacity", function (d) {
                return (d.id in neighbors) ? DEFAULT_ALPHA : 0;
            });
        }
        function handle_mouseout(node) {
            circle.transition().style("opacity", DEFAULT_ALPHA);
            path.transition().style("stroke-width", .1);
            text.transition().style("opacity", 1);
        }

    }

    return makeGraph;
}