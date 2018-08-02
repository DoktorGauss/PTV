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
        url: './Images/circle_gray.png',  
        description: 'Location',
        colorCode: '#5e5e5e'
    },
    red : {
        url: './Images/circle_red.png',
        description: 'Mandatory Location',
        colorCode: "#e02129"
    },
    blue : {
        url: './Images/circle_blue.png',
        description: 'Cluster',
        colorCode: "#00accd"
    },
    orange : {
        url: './Images/circle_orange.png',
        description: 'Mandatory Cluster',
        colorCode: '#f49f2f'
    }
}

// the style for clusters
var clusterStyle = function (feature) {
    return {
        weight: 1,
        opacity: 1,
        color: 'black',
        dashArray: '',
        fillOpacity: 0.25,
        fillColor: colors[feature.properties.id % colors.length]
    };
};
                        
// a palette of colors for visualizing clusters
var colors = ["#8dd3c7", "#ffffb3", "#bebada", "#fb8072", "#80b1d3", "#fdb462", "#b3de69", "#fccde5", "#d9d9d9", "#bc80bd", "#ccebc5", "#ffed6f"];  

/**
 * Converts a location to a cluster
 * @param {Object} location
 * @return {Object} a cluster
 */
function planningLocationToClusterFacility(planningLocation) {
    return {
        "$type": "ClusterFacility",
        "cluster": {
            "id" : planningLocation.location.id,
            "referenceLocation" : planningLocation.location.routeLocation
        },
        "cost" : Math.round(planningLocation.activity)          
    };            
}

/**
 * Converts a cluster to a location
 * @param {Object} cluster
 * @return {Object} a location
 */
function clusterFacilityToPlanningLocation(clusterFacility) {
    return {
        "$type": "PlanningLocation",
        "location": {
            "id" : clusterFacility.cluster.id,
            "routeLocation" : clusterFacility.cluster.referenceLocation
        },
        "activity": clusterFacility.cost
    };            
}

/**
 * Get the coordinate of the specified location.
 * @param {Object} location 
 * @return {Coordinate} Coordinate of the location.
 */
function getCoordinateOfLocation(location){
    var coordinateX = location.routeLocation.offRoadCoordinate.x;
    var coordinateY = location.routeLocation.offRoadCoordinate.y;
    var coordinate = [coordinateX, coordinateY];
    return coordinate;
}

/**
 * Get the latLng of the specified location.
 * @param {Object} location 
 * @return {L.latLng} latLng of the location.
 */			
function getLatLongOfLocation(location){
// Be careful: coordinates are swapped!
    var coordinateX = location.routeLocation.offRoadCoordinate.x;
    var coordinateY = location.routeLocation.offRoadCoordinate.y;
    var coordinate = L.latLng(coordinateY, coordinateX);
    return coordinate;
}   

/**
 * Get the latLng of the specified location.
 * @param {Object} location 
 * @return {L.latLng} latLng of the location.
 */			
function getLatLongOfPlanningLocation(location){
// Be careful: coordinates are swapped!
    var coordinateX = location.location.routeLocation.offRoadCoordinate.x;
    var coordinateY = location.location.routeLocation.offRoadCoordinate.y;
    var coordinate = L.latLng(coordinateY, coordinateX);
    return coordinate;
} 

/**
 * Get the Coordinate of the specified cluster.
 * @param {Object} cluster 
 * @return {Coordinate} Coordinate of the cluster.
 */	
function getCoordinateOfCluster(cluster){
    var coordinateX = cluster.referenceLocation.offRoadCoordinate.x;
    var coordinateY = cluster.referenceLocation.offRoadCoordinate.y;
    var coordinate = [coordinateX, coordinateY];
    return coordinate;
}

/**
 * Get the latLng of the specified cluster.
 * @param {Object} cluster 
 * @return {L.latLng} latLng of the cluster.
 */				
function getLatLongOfCluster(cluster){
// Be careful: coordinates are swapped!
    var coordinateX = cluster.referenceLocation.offRoadCoordinate.x;
    var coordinateY = cluster.referenceLocation.offRoadCoordinate.y;
    var coordinate = L.latLng(coordinateY, coordinateX);
    return coordinate;
}   

/**
 * Calculate the convex hull of the specified points.
 * 
 * Algorithm: Andrew's monotone chain convex hull algorithm
 *
 * @param {Array} points
 * @return {Array} points belonging to the convex hull.
 */	             
function convexHull(points) {    
    var n = points.length, lower = [], upper = [];
    
    points = points.slice().sort(function(location1, location2) {
        var a = getLatLongOfPlanningLocation(location1);
        var b = getLatLongOfPlanningLocation(location2);                    
        return a.lng === b.lng ? a.lat - b.lat : a.lng - b.lng;
    });
    
    function crossProduct(loc_o, loc_a, loc_b) {
        var a = getLatLongOfPlanningLocation(loc_a);
        var b = getLatLongOfPlanningLocation(loc_b);
        var o = getLatLongOfPlanningLocation(loc_o);
        return (a.lng - o.lng) * (b.lat - o.lat) - (a.lat - o.lat) * (b.lng - o.lng);
    }  
    
    for (var i = 0; i < n; i++) {
        while (lower.length >=2 && crossProduct(lower[lower.length - 2], lower[lower.length - 1], points[i]) <= 0) lower.pop();
        lower.push(points[i]);
    }
    for (i = n - 1; i >= 0; i--) {
        while (upper.length >= 2 && crossProduct(upper[upper.length - 2], upper[upper.length - 1], points[i]) <= 0) upper.pop();
        upper.push(points[i]);
    }
    upper.pop();
    lower.pop();
    return lower.concat(upper);
}

/**
 * Returns the FeatureCollection to the specified features.
 * @param {Array} features
 * @return {Object} FeatureCollection with the specified features.
 */	
function getFeatureCollection(features) {                 
    return {"type": "FeatureCollection", "features":  features}          
}

/**
 * Returns the Feature to the specified locations.
 * @param {Array} locations
 * @return {Object} Feature with the specified locations.
 */	
function getFeature(planningLocations){
    var coordinates = [];
    for(var i = 0; i < planningLocations.length; i++) {
        coordinates.push(getCoordinateOfLocation(planningLocations[i].location));
    }                
    return { "geometry": {
                "type": "Polygon",
                "coordinates": [coordinates]
            },
            "type": "Feature",
            "properties": {
                "id": ("" + idCounter++ )
            }
        };
}

/**
 * Clone the specified location.
 * @param {Object} location
 * @return {Object} a deep copy of the location.
 */	
function clonePlanningLocation(planningLocation) {
    return {
        "$type": "PlanningLocation",
        "location": {
            "id": planningLocation.location.id,
            "routeLocation": {
                "$type": "OffRoadRouteLocation",
                "offRoadCoordinate": {
                    "x": planningLocation.location.routeLocation.offRoadCoordinate.x,
                    "y": planningLocation.location.routeLocation.offRoadCoordinate.y
                }
            }
        },
        "activity": planningLocation.activity
    };           
}

/**
 * Clone the specified cluster.
 * @param {Object} cluster
 * @return {Object} a deep copy of the cluster.
 */	
function cloneClusterFacility(clusterFacility) {
    return {
            "$type": "ClusterFacility",
            "cluster": {
                "id": clusterFacility.cluster.id,
                "referenceLocation": {
                    "$type": "OffRoadRouteLocation",
                    "offRoadCoordinate": {
                        "x": clusterFacility.cluster.referenceLocation.offRoadCoordinate.x,
                        "y": clusterFacility.cluster.referenceLocation.offRoadCoordinate.y
                    }
                }
            },
          "cost": clusterFacility.cost
        };           
}


// color legend
L.Control.Legend = L.Control.extend({
    options: {position: 'topright'},
    onAdd: function() {
        this._container = L.DomUtil.create('div', 'controlPanel');
        this._container.id = "legend";
        
        var content = '<ul style="padding: 0;margin: 0;list-style-type: None;">'
        
        for(var key in circleColors) {
            var element = '<li> <span style="color:' + circleColors[key].colorCode + '; margin-right:"5px"><i class="fa fa-circle"></i></span>' 
                + ' ' + circleColors[key].description + '</li>';
            content += element;
        }
        
        this._container.innerHTML += content + '</ul>';
        
        if (L.DomEvent) {
            L.DomEvent.disableClickPropagation(this._container);
            L.DomEvent.disableScrollPropagation(this._container);
        }
        
        return this._container;
    }
});