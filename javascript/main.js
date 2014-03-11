// Global variables for ease of use, would most likely
// package any larger classes into classes
var map = null;
var state_layer = null;
var states_geo_json = null;
var states_data = null;
var color_array = ["rgb(103,0,31)","rgb(178,24,43)","rgb(214,96,77)","rgb(244,165,130)","rgb(253,219,199)","rgb(209,229,240)","rgb(146,197,222)","rgb(67,147,195)","rgb(33,102,172)","rgb(5,48,97)"];

// Loads data, initializes map, draws everything.
function start(){
  $.getJSON("data/state_geo.json",function(us_states){
    $.getJSON('http://flu-vaccination-map.hhs.gov/api/v1/states.json?ethnicity=all&callback=?',function(data){
      states_geo_json= us_states;
      states_data = data.results;
      initialize_map();
      draw_states();
    })
  });
}
start();
/* Create map, center it */
function initialize_map(){
  map = new L.Map("map", {})
    // Lebanon, KS, Zoom level 4.
    .setView(new L.LatLng(37.8, -96.9), 4)
    .addLayer(new L.TileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png',{
      attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
    }));
  initialize_info_box();
  initialize_legend();
  intialize_reset_button();
  initialize_table();
}
// Initializes the info box, which uses a handlebars template
function initialize_info_box(){
  info = L.control();
  // Prepare Template
  var info_source   = $("#info_template").html();
  var info_template = Handlebars.compile(info_source);
  info.onAdd = function (map) {
    this._div = L.DomUtil.create('div', 'info'); // create a div with a class "info"
    this.update({});
    return this._div;
  };
  info.update = function (context) {
    this._div.innerHTML = info_template(context);
  };
  info.addTo(map);
}
/*
 * Create a color Legend.
 * Rewritten to remove d3 for ie8 capability
 */
function initialize_legend(){
  legend = L.control({position: 'bottomright'});
  legend.onAdd = function(map){
    function legend_text(i){
      if (i==0) { return "Less than 10%"}
      else if (i==9){return "90% or more"}
      else {return (i*10) + '% - ' + (i*10+10) + '%'};
    }
    var div = L.DomUtil.create('div', 'legend');
    div.innerHTML="Vaccination Claims Rate<br/>";
    for(var i=0; i < 10; i++){
      div.innerHTML += '<i style="background:' + color_array[i] + '"></i> '+ legend_text(i)+'<br>';
    }
    return div;
  }
  map.addControl(legend);
}

/* Initialize reset button */
function intialize_reset_button(){
  reset_button = L.control({position: 'bottomleft'});
  reset_button.onAdd = function(map){
    var div = L.DomUtil.create('div', 'info');
    div.innerHTML='<a class="reset_button" href="#" title="Reset Map">Reset</a>';
    return div;
  }
  map.addControl(reset_button);
  $('.reset_button').click(function(){
    map.fitBounds(state_layer.getBounds());
  });
}
/* Initializes a table, uses handlebars to fill in data */
function initialize_table(){
  table = $('#table_container');
  var table_source = $("#table_template").html();
  var table_template = Handlebars.compile(table_source);
  table.html(table_template(states_data));
}

// Draw all the states on the map
function draw_states(){
  state_layer = L.geoJson(states_geo_json,{
    style: state_styles,
    onEachFeature: state_features,
    updateWhenIdle: true
  });
  state_layer.addTo(map);
}

// Styles each state, populates color based on data
function state_styles(feature){
  return{
    stroke: true,
    fillColor: state_color(feature),
    fillOpacity: 0.7,
    weight: 1.5,
    opacity: 1,
    color: 'black',
    zIndex: 15
  };
}
// Gets the color based on percentage
function state_color(feature){
  var state = get_single_state_data(feature.properties.name);
  return color_picker(state['percentage']);
}
// Returns a single states data by filtering for abbreviation
function get_single_state_data(state_name){
  var local_states = states_data.filter(function(item){return item.name == state_name});
  return local_states[0];
}
/*
 * Color Picker picks a color from a data array,
 * could use a library if so desired
 */
function color_picker(percentage){
  var bucket = Math.floor(percentage * 10);
  if(color_array[bucket]!= null){
    return color_array[bucket];
  }else{
    return "rgb(0,0,0)";
  }
}

// set up state features (such as on click events and others)
function state_features(feature, layer){
  // this sets all the data needed for the hover info window. will refactor later
  function state_info_window(state){
    var this_states_data = get_single_state_data(feature.properties.name);
    info.update(this_states_data);
  }
  // change the state styles so its highlighted with a gray border for now
  function highlightState(e) {
    var layer = e.target;
    layer.setStyle({
      weight: 5, color: '#666', dashArray: '', fillOpacity: 0.7
    });
  }
  // disable highlight by using reset style
  function resetHighlightState(e) {
    state_layer.resetStyle(e.target);
  }
  // add click, mouseover, and mouseout interactions to state
  layer.on({
    click: function(){
      map.fitBounds(layer.getBounds());
      // Here we could something interesting, like grab county data
      // change styles, whatever we'd be interested in
    },
    // set data for info window, highlight
    mouseover: function(e){
      state_info_window(feature.properties.name)
      highlightState(e);
    },
    // remove info window, reset highlight
    mouseout: function(e){
      info.update();
      resetHighlightState(e);
    }
  })
}


