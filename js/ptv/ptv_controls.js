
/**
 * Extend functionality of Leaflet Control to RouteResponseMetrics
 * Shows distance and traveltime of a calculated route
 */
L.Control.RouteResponseMetricsControl = L.Control.extend({
    options: {
        'position': 'topright'
    },
    
    // on adding the control to the specified map
    onAdd: function(map) {
        this._container = L.DomUtil.create('div', 'controlPanel');
         
      this._container.innerHTML =  
        '<table class="xserver-parameter-control">\
            <tr><td width="80px">Distance</td><td style="text-align:right; min-width:90px"><span id="routemetrics_distance">-</span></tr>\
            <tr><td width="80px">Traveltime</td><td style="text-align:right; min-width:90px"><span id="routemetrics_traveltime">-</span></td></tr>\
        </table>';

        if (L.DomEvent) {
            L.DomEvent.disableClickPropagation(this._container);
            L.DomEvent.disableScrollPropagation(this._container);
        }
        return this._container;
    },
    
    // show new values
    update: function (routeResponse) {
        $('#routemetrics_distance').text(formatDistance(routeResponse.distance));
        $('#routemetrics_traveltime').text(formatTime(routeResponse.travelTime));
    },
    
    // clear old values
    clear: function() {
        $('#routemetrics_distance').text('-');
        $('#routemetrics_traveltime').text('-');
    }
});


function formatDistance(meters_arg) {
    var meters = meters_arg;
    
    if(meters < 1000)
        return String(meters + " m");
    
    // mm stands for mega-meters, SI_units ftw
    var distance_mm = 0;
    if(meters > 1000000)
        distance_mm = Math.floor(meters  / 1000000);
    
    distance_m = meters % 1000;
    distance_km = Math.floor(meters / 1000) % 1000;
    
    var show_time = distance_mm > 0;
    
    return String((show_time ? distance_mm + "," : "" ) 
        + (show_time  && distance_km < 100 ? "0" : "") 
        + (show_time  && distance_km < 10 ? "0" : "") 
        + distance_km 
        + "." + ((show_time = show_time || distance_km > 0) && distance_m < 100 ? "0" : "") 
        + (show_time && distance_m < 10 ? "0" : "") 
        + distance_m + " km");
}


function formatTime(seconds) {
    var time = seconds,
        time_s = (time = Math.floor(seconds)) % 60,
        time_min = (time = Math.floor(time / 60)) % 60,
        time_h = (time = Math.floor(time / 60)) % 24,
        time_d = (time = Math.floor(time / 24));
    
    var show_time = time_d > 0;
 
    return String((show_time ? (time_d   + " d, " ) : "" ) 
        + ((show_time = show_time || time_h   > 0) ? ((time_d   > 0 && time_h   < 10 ? "0" : "") + time_h   + " h, " ) : "" )
        + ((show_time = show_time || time_min > 0) ? ((time_h   > 0 && time_min < 10 ? "0" : "") + time_min + " m, " ) : "" )
        +                                             (time_min > 0 && time_s   < 10 ? "0" : "") + time_s   + " s"  );
}

/**
 * Contains generic scene manipulation buttons.
 * Currently: Reset, Last Request, Last Response
 */
L.Control.ResetControl = L.Control.extend({
    options: {
        'position': 'topright',
        'onResetRouteClicked': function() {},
    },
    onAdd: function(map) {
        this._container = L.DomUtil.create('div', 'controlPanel');
        this._container.id = "reset-control";
        
        this._container.innerHTML = 
            '<button id="resetRoute" type="button" class="btn btn-default">\
                <span class="glyphicon glyphicon-trash" aria-hidden="true"></span> Reset\
            </button>';

        if (L.DomEvent) {
            L.DomEvent.disableClickPropagation(this._container);
            L.DomEvent.disableScrollPropagation(this._container);
        }

        setTimeout((function () { // Need to defer until innerHTML applied
            $('#resetRoute').click(this.options.onResetRouteClicked);
        }).bind(this), 0);

        return this._container;
    }
});

/**
 * Extend functionality of Leaflet Control to show limitations of a response.
 */
L.Control.LimitationControl = L.Control.extend({
    options: {
        'position': 'topright',
        'limitation': null,
        'width' : '420px'
    },
        
    // on adding the control to the specified map
    onAdd: function(map) {
        this._container = L.DomUtil.create('div', 'controlPanel');
         
        var content  = '<div style="min-width:260px;width:' + this.options.width + '">';
        content += '<h4><b>' + this.options.limitation[0].$type + '</b></h4>';
        content += this.options.limitation[0].message + '<br/>';
        content += '<i>' + this.options.limitation[0].hint + '</i><br/>';
        content +='</div>';
        this._container.innerHTML += content

        if (L.DomEvent) {
            L.DomEvent.disableClickPropagation(this._container);
            L.DomEvent.disableScrollPropagation(this._container);
        }
        return this._container;
    },

});
