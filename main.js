var defaultColumns = ["name", "continent", "gdp", "life_expectancy", "population", "year"];
var init = function(){
  var table = d3.select("body").append("table");
  table.append("thead").attr("class", "thead").append("tr");
  table.append("tbody");
  table.append("caption")
    .html("World Countries Ranking");
};

var prepareData = function(rawData){
  var yearLevelRows = [];
  rawData.forEach(function(country){ // each country object
    country.years.forEach(function(year){ //each country-year object
      yearLevelRows.push({
        "name": country.name,
        "continent": country.continent,
        "gdp": year.gdp,
        "life_expectancy": year.life_expectancy,
        "population": year.population,
        "year": year.year
      });
    });
  });
  return yearLevelRows;
};

var tableData = [];
d3.json("data/countries_1995_2012.json", function(error, data){
    tableData = prepareData(data);
    init();
    buildTable(defaultColumns, tableData);
});

var applyFilter = function(filterValues, filterOn) {
  var filteredData = [];
  tableData.forEach(function(elm){
    if (filterValues.indexOf(elm[filterOn]) != -1) // if elm[filterOn] is one of the selected values
      filteredData.push(elm);
  });
  return filteredData;
};

var filterByContinent = function() {
  var continents = [];
  d3.selectAll("input").each(function(d) { //Find all the selected continents
    if(d3.select(this).attr("type") == "checkbox" && d3.select(this).node().checked) {
      continents.push(d3.select(this).attr("name"));
    }
  });

  if (continents.length != 0) { //show filtered data only if a checkbox is selected
    var filteredData = applyFilter(continents, "continent");
    buildTable(defaultColumns, filteredData);
  }
  else  {// If no checkbox is selected, show all data
    buildTable(defaultColumns, tableData);
  }
};

var filterByYear = function(year) {
  var filteredData = applyFilter([year], "year");
  buildTable(defaultColumns, filteredData);
};

var doAggregation = function(aggregateBy){
  if (!aggregateBy) {
    filterByContinent();
  }
  else {
    var aggregatedRows = d3.nest()
      .key(function(d){ return d[aggregateBy]; }) // group by continent
      .key(function(d){ return d["year"]; }) //secondary grouping on year
      .rollup(function(leaves, i){
        return {
          // name, continent, gdp, life_expectancy, population, year
          name: leaves[0][aggregateBy], // grab the continent value from the first array element
          population: d3.sum(leaves, function(x){ return +x.population; }),
          gdp: d3.sum(leaves, function(x){ return +x.gdp; }),
          life_expectancy: d3.min(leaves, function(x){ return +x.life_expectancy; }),
          year: leaves[0].year,
          continent: leaves[0].continent
        };
      })
      .map(tableData, d3.map); // This is IMPORTANT. Because of this, I can directly use map.values()

      var finalRows = [];
      aggregatedRows.values().forEach(function(d){
        finalRows = finalRows.concat(d.values());
      });
    buildTable(defaultColumns, finalRows);
  };
};

var buildTable = function (columns, data){
  var headerRow = d3.select("thead>tr");
  var tbody = d3.select("tbody");

  // Remove all existing rows and start from scratch!
  headerRow.selectAll("th").remove();
  tbody.selectAll("tr.row").remove();

  var sortToggle = true;
  headerRow.selectAll("th")
    .data(columns) // adding the header row with columns[]
  .enter()
    .append("th")
    .text(function(d) { return d; })
    .on("click", function(header, i) { //sort functionality on click.
      sortToggle = !sortToggle;
      tbody.selectAll("tr").sort(function(a, b) {
        if (a[header] === b[header]) // To resolve conflicts, secondary sort on name
            return d3.ascending(a["name"], b["name"]);

        if (typeof(a[header]) === "string")
          return sortToggle ? d3.descending(a[header], b[header]) : d3.ascending(a[header], b[header]);

        if (typeof(a[header]) === "number"){
          return sortToggle ? a[header] - b[header] : b[header] - a[header];
        }
      });
    });

  var rows = tbody.selectAll("tr.row")
      .data(data)
    .enter()
      .append("tr").attr("class", "row");

  var cells = rows.selectAll("td")
    .data(function(row) { // row is referring to the object that is already bound to the selection
        return d3.range(columns.length).map(function(d, i){
          // FORMATTING NUMBERS
          if (columns[i] == "life_expectancy")
            return d3.round(row[columns[i]],1);

          if (columns[i] == "population") {
            var format = d3.format(",");
            return format(row[columns[i]]);
          }

          if (columns[i] == "gdp") {
            return d3.format("4.1s")(row[columns[i]]);
          }

          return row[columns[i]];
        });
        // return d3.range(Object.keys(row).length).map(function(column, i) {
        //     return row[Object.keys(row)[i]];
        // });
    });

  cells
    .enter()
      .append("td")
      .text(function(d) {
        return d;
      });

  buildChart(data);
};
var buildChart = function(data, field){
  field = "life_expectancy"  ;
  var width = 400,
      height = 500,
      barHeight = 10;

  var min = d3.min(data, function(d){  return d[field]; });
  var max = d3.max(data, function(d){  return d[field]; });
  console.log(max);

  var x = d3.scale.linear()
      .domain([min, max])
      .range([0, width]);

  var chart = d3.select("svg")
      .attr("width", width)
      .attr("height", data.length * barHeight);

  var bar = chart.selectAll("g")
      .data(data)
    .enter()
      .append("g")
      .attr("transform", function(d ,i){  return "translate(0, "+ i*barHeight + ")"});

  bar.append("rect")
      .attr("width", function(d){ return x(d[field]); })
      .attr("height", barHeight - 1);

  bar.append("text")
      .attr("x", function(d){ return x(d[field]) + 5; })
      .attr("y", barHeight/2)
      .text(function(d){  return d3.round(d[field], 1);  }); //Rounding format applied here

};