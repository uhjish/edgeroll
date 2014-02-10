function composeRow(item, who, dimensions){

    var cell = d3.select(who).selectAll(".g-cell")
        .data(dimensions)
      .enter().append("g")
        .attr("class", "gdaily-cell")
        .classed("g-quantitative", function(dimension) { return dimension.scale; })
        .classed("g-categorical", function(dimension) { return dimension.categorical; })
        .attr("transform", function(dimension, i) { return "translate(" + i * 160 + ")"; });
    var quantitativeCell = cell.filter(function(dimension) { return dimension.scale && !isNaN(item[dimension.name]); });

    quantitativeCell.append("rect")
        .attr("class", "g-bar")
        .attr("width", function(dimension) { return dimension.scale(item[dimension.name]);  })
        .attr("height", 20);


    cell.append("text")
        .attr("class", "g-value")
        .attr("x", function(dimension) { return dimension.scale ? 3 : 0; })
        .attr("y", function(dimension) { return dimension.categorical ? 9 : 10; })
        .attr("dy", ".35em")
        .classed("g-na", function(dimension) { return item[dimension.name] === undefined; })
        .classed("g-yes", function(dimension) { return item[dimension.name] === true; })
        .classed("g-no", function(dimension) { return item[dimension.name] === false; })
        .text(function(dimension) { return dimension.format(item[dimension.name]); })
        .attr("clip-path", function(dimension) { return (dimension.clipped = this.getComputedTextLength() > 140) ? "url(#g-clip-cell)" : null; });

    cell.filter(function(dimension) { return dimension.clipped; }).append("rect")
        .style("fill", "url(#g-clip-gradient)")
        .attr("x", 136)
        .attr("width", 20)
        .attr("height", 20);
}


function setupPlots( hdata ){

  var ndx = crossfilter(hdata);

  var all = ndx.groupAll();

  var sessionsBy;
  hdata.sort(function(a, b) {
    return d3.ascending(a.name, b.name);
  });

  hdata.forEach(function(item, i) {
    item.index = i;
  });

  var formatDollars = d3.format(".3f"),
      formatMinutes = d3.format("02d"),
      formatHours = function(d) { return isNaN(d) ? "N.A." : Math.floor(d) + ":" + formatMinutes(Math.round((d % 1) * 60)); },
      formatCurrency = function(d) { return isNaN(d) ? "N.A." : formatDollars(d); },
      formatDecimal = d3.format(".2e"),
      formatCategorical = function(d) { return d === true ? "<" : d === false ? ">" : "N.A."; },
      formatDefault = String;

  var eventsScale = d3.scale.linear().domain([0, d3.max(hdata, function(d){return d["events"]; })]).range([0,15]),
      sessionsScale = d3.scale.linear().domain([0, d3.max(hdata, function(d) { return d["sessions"]; })]).range([0, 15]),
      convertScale = d3.scale.linear().domain([0, d3.max(hdata, function(d) { return d["convert"]; })]).range([0, 15]),
      convrateScale = d3.scale.log().domain([0, d3.max(hdata, function(d) { return d["conv_rate"]; })]).range([0, 15]);

  var dimensions = [
    {name: "campaign_name", format:     formatDefault},
    {name: "sessions", format:    formatDefault, scale: sessionsScale},
    {name: "convert", format:    formatDefault, scale: sessionsScale},
    {name: "conv_rate", format: formatDecimal}
  ];
  var weeklyDimensions = [
    {name: "campaign_name", format:     formatDefault},
    {name: "conv_rate", format:    formatDefault, scale: sessionsScale},
    {name: "convert", format:    formatDefault, scale: sessionsScale},
    {name: "sessions", format: formatDecimal}
  ];

  var monthlyDimensions = [
    {name: "campaign_name", format:     formatDefault},
    {name: "conv_rate", format:    formatDefault, scale: sessionsScale},
    {name: "convert", format:    formatDefault, scale: sessionsScale},
    {name: "sessions", format: formatDecimal}
  ];

  dimensions.forEach(function(dimension, i) {
    dimension.index = i;
    dimension.weekly = weeklyDimensions[i].name;
    dimension.monthly = monthlyDimensions[i].name;

  });

  var row = d3.select("#gdaily-chart").selectAll(".g-row")
      .data(hdata)
    .enter().append("g")
      .attr("class", "g-row")
      .attr("transform", function(item, i) { return "translate(0," + i * 21 + ")"; });

  row.append("rect")
      .attr("class", "g-background")
      .attr("width", "100%")
      .attr("height", 20);

  row.each(function(item){
      composeRow(item, this, dimensions);
  });

  var weeklyRow = d3.select("#gweekly-chart").selectAll(".gw-row")
      .data(hdata)
    .enter().append("g")
      .attr("class", "gw-row")
      .attr("transform", function(item, i) { return "translate(0," + i * 21 + ")"; });
  weeklyRow.append("rect")
      .attr("class", "g-background")
      .attr("width", "100%")
      .attr("height", 20);

  weeklyRow.each(function(item){
      composeRow(item, this, weeklyDimensions);
  });
  var monthlyRow = d3.select("#gmonthly-chart").selectAll(".gm-row")
      .data(hdata)
    .enter().append("g")
      .attr("class", "gm-row")
      .attr("transform", function(item, i) { return "translate(0," + i * 21 + ")"; });
  monthlyRow.append("rect")
      .attr("class", "g-background")
      .attr("width", "100%")
      .attr("height", 20);

  monthlyRow.each(function(item){
      composeRow(item, this, monthlyDimensions);
  });

  d3.selectAll(".g-special .g-categorical").append("text")
      .attr("class", "g-value g-label")
      .attr("x", 15)
      .attr("y", 10)
      .attr("dy", ".35em")
      .text(function(dimension) { return "No"; });


  d3.selectAll(".g-body .g-subtitle")
      .data(dimensions)
      .on("click",sort);
    
}

function orderQuantitativeDim( dimensionName, descending ){
  /** Currying to support independent sorting of the 
   *  weekly and monthly tables
   * */

  if (descending){
     return function( a, b ){
      return (isNaN(a[dimensionName]) - isNaN(b[dimensionName]))
          || (a[dimensionName] - b[dimensionName])
          || (a.index - b.index);
    };
   }else{
    return function( a, b){
      return (isNaN(a[dimensionName]) - isNaN(b[dimensionName]))
          || (b[dimensionName] - a[dimensionName])
          || (a.index - b.index);
    };
  }
}

function sort(dimension) {
  var dimensionName = dimension.name,
      descending = d3.select(this).classed("g-ascending");
  //var dmName = mdimensions[didx].name;

  d3.selectAll(".g-descending").classed("g-descending", false);
  d3.selectAll(".g-ascending").classed("g-ascending", false);

  if (descending) {
    d3.select(this).classed("g-descending", true);
    var orderName = function(a, b) {
      return b.name.localeCompare(a.name);
    };
  } else {
    d3.select(this).classed("g-ascending", true);
    var orderName = function(a, b) {
      return a.name.localeCompare(b.name);
    };
  }
  d3.selectAll(".g-row")
      .sort(dimensionName === "name" ? orderName : orderQuantitativeDim(dimensionName, descending))
      .each(function(item, i) { item.index = i; })
    .transition()
      .delay(function(item, i) { return (i - 1) * 10; })
      .duration(750)
      .attr("transform", function(item, i) { return "translate(0," + i * 21 + ")"; });
  d3.selectAll(".gw-row")
      .sort(dimensionName === "name" ? orderName : orderQuantitativeDim(dimension.weekly, descending))
      .each(function(item, i) { item.index = i; })
    .transition()
      .delay(function(item, i) { return (i - 1) * 10; })
      .duration(750)
      .attr("transform", function(item, i) { return "translate(0," + i * 21 + ")"; });
  d3.selectAll(".gm-row")
      .sort(dimensionName === "name" ? orderName : orderQuantitativeDim(dimension.monthly, descending))
      .each(function(item, i) { item.index = i; })
    .transition()
      .delay(function(item, i) { return (i - 1) * 10; })
      .duration(750)
      .attr("transform", function(item, i) { return "translate(0," + i * 21 + ")"; });
}
/*(function() {

var csvCall = d3.csv("out.csv")
  .on( "load", function( hdata){
    console.log("success");
    setupPlots(hdata);
    dc.renderAll();
    return;
  });
csvCall.get()

})();
*/
