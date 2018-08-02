'use strict';

/**
 * Returns a circle icon with the specified size and color.
 * @param {Number} size 
 * @param {Object} color subelement of circleColors.
 * @return {L.icon} a circle icon with the specified size and color.
 */
function getCircleIcon(size, color) {
    return L.icon({
        iconUrl:      color.url,
        iconSize:     [size, size], 
        iconAnchor:   [Math.floor(size / 2), Math.floor(size / 2)], 
        popupAnchor:  [0, (size * (-1))] 
    });
}   
      
// colors used by getCircleIcon()      
var circleColors = {
    gray : {
        url: './Images/Samples/circle_gray.png',  
        description: 'Customer Site',
        colorCode: '#5e5e5e'
    },
   /* red : {
        url: './Images/Samples/circle_red.png',
        description: 'undefined',
        colorCode: "#e02129"
    },
    blue : {
        url: './Images/Samples/circle_blue.png',
        description: 'Vehicle Location',
        colorCode: "#00accd"
    },*/
    orange : {
        url: './Images/Samples/circle_orange.png',
        description: 'Depot Site',
        colorCode: '#f49f2f'
    }
}

var tourStyle =  {
    clickRelationStyle: {
        color: '#2882C8', 
        weight: 10, 
        opacity: 0.5
    },
   defaultRelationStyle: {
        color: '#2882C8', 
        weight: 10, 
        opacity: 0.5
    },
   highlightedRelationStyle: {
        color: '#2882C8', 
        weight: 10, 
        opacity: 1
    },
    triangleStyle: {
        offset: 25, 
        repeat: 60,
        pixelSize: 10, 
        pathOptions: {fillOpacity: 1, weight: 0, color: 'white'}            
    }
};           

    
var tripStyle = {
    clickRelationStyle: {
        color: '#00cd00', 
        weight: 10, 
        opacity: 0.5
    },
    defaultRelationStyle: {
        color: '#00cd00', 
        weight: 10, 
        opacity: 0.5
    },
    highlightedRelationStyle: {
        color: '#008b00', 
        weight: 10, 
        opacity: 1
    },
    triangleStyle: {
        offset: 25, 
        repeat: 60,
        pixelSize: 10, 
        pathOptions: {fillOpacity: 1, weight: 0, color: 'white'}            
    }
};
    
var orderStyle = {  
    clickRelationStyle: {
        color: '#e02129', 
        weight: 12, 
        opacity: 0.5
    },
    defaultRelationStyle: {
        color: '#e02129', 
        weight: 8, 
        opacity: 0.5
    },
    highlightedRelationStyle: {
        color: '#e02129', 
        weight: 12, 
        opacity: 1
    },
    triangleStyle: {
        offset: 25, 
        repeat: 60,
        pixelSize: 8, 
        pathOptions: {fillOpacity: 1, weight: 0, color: 'white'}            
    }
};


/**
 * Extend functionality of Leaflet Control 
 */
L.Control.CostReportControl = L.Control.extend({
    options: {
        'position': 'topright'
    },
    
    // on adding the control to the specified map
    onAdd: function(map) {
        this._container = L.DomUtil.create('div', 'controlPanel');
         
      this._container.innerHTML =  
        '<h5 style="margin-top:5px"><b>Accumulated cost report<b></h5><table class="xserver-parameter-control">\
            <tr><td width="80px">Distance</td><td style="text-align:right; min-width:90px"><span id="costreport-distance">-</span></td></tr>\
            <tr><td width="80px">Traveltime</td><td style="text-align:right; min-width:90px"><span id="costreport-traveltime">-</span></td></tr>\
            <tr><td width="80px">Drivingtime</td><td style="text-align:right; min-width:90px"><span id="costreport-drivingtime">-</span></td></tr>\
        </table>';

        if (L.DomEvent) {
            L.DomEvent.disableClickPropagation(this._container);
            L.DomEvent.disableScrollPropagation(this._container);
        }
        return this._container;
    },
    
    // show new values
    update: function (costReport) {
        $('#costreport-distance').text(formatDistance(costReport.distance));
        $('#costreport-traveltime').text(formatTime(costReport.travelTime));
        $('#costreport-drivingtime').text(formatTime(costReport.drivingTime));
    },
    
    // clear old values
    clear: function() {
        $('#costreport-distance').text('-');
        $('#costreport-traveltime').text('-');
        $('#costreport-drivingtime').text('-');
    }
});  

// color legend
L.Control.Legend = L.Control.extend({
    options: {position: 'topright'},
    onAdd: function() {
        this._container = L.DomUtil.create('div', 'controlPanel');
        
        var content = '<ul style="padding: 0;margin: 0;list-style-type: None;">'
        
        for(var key in circleColors) {
            var element = '<li> <span style="color:' + circleColors[key].colorCode + '; margin-right:"5px"><i class="fa fa-circle"></i></span>' 
                + ' ' + circleColors[key].description + '</li>';
            content += element;
        }
        
        content += '</ul><hr style="margin:5px"><ul style="padding: 0;margin: 0;list-style-type: None;">';
        content += '<li> <span style="color:' + orderStyle.defaultRelationStyle.color + '; margin-right:"5px"><i class="fa fa-circle"></i></span> Orders</li>';
        content += '<li> <span style="color:' + tourStyle.defaultRelationStyle.color + '; margin-right:"5px"><i class="fa fa-circle"></i></span> Tours</li>';
        content += '<li> <span style="color:' + tripStyle.defaultRelationStyle.color + '; margin-right:"5px"><i class="fa fa-circle"></i></span> Trips</li>';
        
        this._container.innerHTML += content + '</ul>';
        
        if (L.DomEvent) {
            L.DomEvent.disableClickPropagation(this._container);
            L.DomEvent.disableScrollPropagation(this._container);
        }
        
        return this._container;
    }
});   

/**
 * Clone the specified location.
 * @param {Object} location
 * @return {Object} a deep copy of the location.
 */	
function cloneLocation(location) {
    var clone = {
      "$type": location.$type,
      "id": location.id,
      "routeLocation": {
        "$type": "OffRoadRouteLocation",
        "offRoadCoordinate": {
          "x": location.routeLocation.offRoadCoordinate.x,
          "y": location.routeLocation.offRoadCoordinate.y
        }
      }
    }; 
    
    if("openingIntervals" in location) 
        clone.openingIntervals = cloneOpeningIntervals(location.openingIntervals);
    if("serviceTimePerStop" in location) 
        clone.serviceTimePerStop = location.serviceTimePerStop;
    if("ignoreVehicleDependentServiceTimeFactorForOrders" in location) 
        clone.ignoreVehicleDependentServiceTimeFactorForOrders = location.ignoreVehicleDependentServiceTimeFactorForOrders;
    
    return clone;                
}

function cloneOpeningIntervals(intervals) {
    var clone = [];
    for(var i = 0; i < intervals.length; i++) {
        clone.push({
          "$type": "StartDurationInterval",
          "start": intervals[i].start,
          "duration": intervals[i].duration
        });
    } 
    return clone;                
}

function cloneOrder(order) {
    if(order.$type == "PickupDeliveryOrder") {
        return {
          "$type": "PickupDeliveryOrder",
          "id": order.id,
          "quantities": cloneQuantities(order.quantities),
          "pickupLocationId": order.pickupLocationId,
          "serviceTimeForPickup": order.serviceTimeForPickup,
          "deliveryLocationId": order.deliveryLocationId,
          "serviceTimeForDelivery": order.serviceTimeForDelivery
        }
    } else {    // VisitOrder
        return   {
          "$type": "VisitOrder",
          "id": order.id,
          "locationId": order.locationId,
          "serviceTime": order.serviceTime
        }
    }
}  

function cloneQuantities(quantities) {
    var clone = [];
    for(var i = 0; i < quantities.length; i++) {
        clone.push(quantities[i]);
    }
    return clone;
}

function cloneVehicle(vehicle) {
    return {
        "ids": vehicle.ids,
        "maximumQuantityScenarios": vehicle.maximumQuantityScenarios,
        "serviceTimeFactorForOrders": vehicle.serviceTimeFactorForOrders,
        "serviceTimePerStop": vehicle.serviceTimePerStop,
        "startLocationId": vehicle.startLocationId,
        "endLocationId": vehicle.endLocationId
      }
}  