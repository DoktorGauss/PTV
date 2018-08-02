'use strict';

/**
 * Current restrictions in this showcase:
 *  - No visit orders
 *  - Max. 3 Opening intervals
 */

var map;
var xTourClient, xDimaClient;
var copyright = '<a href="http://www.ptvgroup.com">PTV</a>, eMapgo';
var resetControl, errorControl, costReportControl, displayModeControl, progressControl;
var markers;
var sampleRequest, sampleResponse;
var requestLocations, requestOrders, requestVehicles;
var responseTrips, responseTours, responseTourReports;
var orderIndicators, tourIndicators, tripIndicators;
var distanceMode, distanceMatrixId;
var orderWasAdded = false;
var vehicleWasAdded = false;
var isFirstRequest = true;
var timerId;
var lastSentDimaOpSeqNo = -1;
var lastestReceivedOpSeqNo = -1;
var clusterUrl = 'https://xserver2-europe-eu-test.cloud.ptvgroup.com';
//var clusterUrl = 'https://xserver2-china-cn.cloud.ptvgroup.com';
var mapUrl = 'https://s0{s}-xserver2-europe-eu-test.cloud.ptvgroup.com';
//var mapUrl = 'https://s0{s}-xserver2-china-test.cloud.ptvgroup.com';

function init() {
    //handle authentication 
    if (!token) {
        var test = $('#Auth').dialog({
            minWidth: 600,
            minHeight: 400
        });
    } else {
        initMap();
    }
}

function handleAuth(elmnt, clr) {
    token = document.getElementById("tokenInput").value;

    var url = clusterUrl + '/services/rest/XMap/tile/0/0/0?xtok=' + token;
    document.getElementById("error").innerHTML = "Loading...";
    httpAsync(url, function (res) {
        if (res == 200) {
            $('#Auth').dialog('close');
            init();
        } else {
            document.getElementById("error").innerHTML = "Invalid token";
        }
    });
}

//run a request
function httpAsync(theUrl, callback) {
    var req = new XMLHttpRequest();
    req.onreadystatechange = function () {
        if (req.readyState == 4)
            callback(req.status);
    }
    req.open("GET", theUrl, true);
    req.send(null);
}

/**
 * Initialization of the sample
 */
function initMap() {
    xTourClient = new XTourClient(clusterUrl + '/services/rs/XTour/');
    xTourClient.setCredentials('xtok', token);
    xDimaClient = new XDimaClient(clusterUrl + '/services/rs/XDima/');
    xDimaClient.setCredentials('xtok', token);

    map = new L.Map('map', {
        zoomControl: false
    }).setView([getParameterByName("lat", 39.91004253720457), getParameterByName("lng", 117.331572723388672)], 10);

    $(window).bind('beforeunload', function () {
        if (distanceMatrixId) {
            xDimaClient.deleteDistanceMatrix({
                "id": distanceMatrixId
            });
        }
    });


    setLocalScenarios(map.getCenter());

    // Creating the scale control in the bottom right corner.
    L.control.scale({
        position: 'bottomright'
    }).addTo(map);
    // Creating the zoom control in the bottom right corner (on top of layer selection).
    var zoom = new L.Control.Zoom({
        position: 'bottomright'
    }).addTo(map);
    var tileUrl = mapUrl + '/services/rest/XMap/tile/{z}/{x}/{y}?xtok={xtok}';

    // add the tileLayer
    var tileLayer = new L.TileLayer(tileUrl, {
        xtok: token,
        subdomains: '1234',
        minZoom: 3,
        maxZoom: 22,
        attribution: copyright,
        noWrap: true
    });
    map.addLayer(tileLayer);
    markers = L.layerGroup().addTo(map);

    addIndicatorLayerGroups();

    // reset button in the top right corner
    resetControl = new L.Control.ResetControl({
        onResetRouteClicked: function () {
            displayModeControl.clear();
            costReportControl.clear();
            progressControl.reset();
            progressControl.hide();

            orderIndicators.clearLayers();
            tourIndicators.clearLayers();
            tripIndicators.clearLayers();

            requestLocations = null;
            requestOrders = null;
            requestVehicles = null;
            responseTours = null;
            responseTourReports = null;
            responseTrips = null;
            orderWasAdded = false;
            vehicleWasAdded = false;
            isFirstRequest = true;

            //resetSidebarContent();
            onScenarioChange();
            if (errorControl)
                map.removeControl(errorControl);
            errorControl = null;
            //redrawSidebarContent();
        },
    }).addTo(map);


    var legend = new L.Control.Legend().addTo(map);
    costReportControl = new L.Control.CostReportControl().addTo(map);
    displayModeControl = new L.Control.DisplayModeControl().addTo(map);
    progressControl = new L.Control.ProgressControl().addTo(map);
    progressControl.setTitle("Calculating Distance Matrix:");
    progressControl.hide();
    initializeScenarioSelection();
    onScenarioChange();
    map.on('click', onMapClick);
    L.control.mousePosition().addTo(map);

}

function redrawSidebarContent() {
    redrawOrderTable();
    redrawVehicleList();
    redrawTourList();
    resetPlanningHorizon();
}


function addIndicatorLayerGroups() {
    orderIndicators = new L.LayerGroup.RelationsLayer(orderStyle).addTo(map);
    tourIndicators = new L.LayerGroup.RelationsLayer(tourStyle).addTo(map);
    tripIndicators = new L.LayerGroup.RelationsLayer(tripStyle).addTo(map);
}

function initializeScenarioSelection() {
    var select = $('#scenario-selection');

    jQuery.each(scenarioLoader.getScenarios(), function (name, val) {
        select.append($('<option></option>').val(name).html(name));
    });
}

function resetSidebarContent() {
    $("#roadDistances").prop('checked', false);
    $("#singleTripPerTour").prop('checked', false);
    $("#singleDepotPerTour").prop('checked', false);
    $("#calculation-mode").val("STANDARD");
    $("#maximum-travel-time-per-tour-enabled").prop('checked', false);
    $("#maximum-travel-time-per-tour").val("46800");
    $("#maximum-travel-time-per-tour").prop('disabled', true);
    $("#maximum-driving-time-per-tour-enabled").prop('checked', false);
    $("#maximum-driving-time-per-tour").val("32400");
    $("#maximum-driving-time-per-tour").prop('disabled', true);
}

function redrawOrderTable() {
    var orderTable = $('#order-control-list');
    orderTable.empty();
    var content = getOrderListContent();
    orderTable.append(content);
    $('#sidebar-content-div').scrollTop(1E10);
}

function redrawVehicleList() {
    var vehicleList = $('#vehicle-control-list');
    vehicleList.empty();
    var content = getVehicleListContent();
    vehicleList.append(content);
    $('#sidebar-content-div').scrollTop(1E10);
}

function redrawTourList() {
    var tourList = $('#tour-list');
    tourList.empty();
    var content = getTourListContent();
    tourList.append(content);
}

function resetPlanningHorizon() {
    $('#horizon-start')[0].value = "2017-01-02";
    $('#horizon-end')[0].value = "2017-01-05";
}

function setLocalScenarios(mapCenter) {
    if (mapCenter.lat == 41.82)
        scenarioLoader.setScenarios(rhodeIslandScenarios);
    else if (mapCenter.lat == -42.88)
        scenarioLoader.setScenarios(tasmaniaScenarios);
    else
        scenarioLoader.setScenarios(luxemburgScenarios);
}

/**
 * Handles a click on the map by adding a location.
 * @param {MouseEvent} evt
 */
function onMapClick(evt) {
    var location = {
        "$type": "CustomerSite",
        "id": "Location " + (requestLocations.length + 1),
        "routeLocation": {
            "$type": "OffRoadRouteLocation",
            "offRoadCoordinate": {
                "x": evt.latlng.lng,
                "y": evt.latlng.lat
            }
        },
        "ignoreVehicleDependentServiceTimeFactorForOrders": true
    };

    // add the new location
    requestLocations.push(location);
    onAddOrder(getDepot().id, location.id);
    redrawOrderTable();
    redrawVehicleList();
    // (re)draw markers
    drawMarkers();
    drawIndicators();
}

function getDepot() {
    for (var i = 0; i < requestLocations.length; i++) {
        if (requestLocations[i].$type === "DepotSite")
            return requestLocations[i];
    }
    return null;
}

/**
 * Draws markers of the locations
 */
function drawMarkers() {
    markers.clearLayers();
    for (var i = 0; i < requestLocations.length; i++) {
        var location = requestLocations[i];
        switch (location.$type) {
            case "CustomerSite":
                drawCustomerSite(location, i);
                break;
            case "DepotSite":
                drawDepotSite(location, i);
                break;
            default: // VehicleLocation
                drawVehicleLocation(location, i);
        }
    }
}

function drawCustomerSite(location, index) {
    var point = getLatLngOfLocation(location);

    var marker = L.marker(point, {
        draggable: true,
        icon: getCircleIcon(24, circleColors.gray),
        title: location.id
    }).addTo(map);

    marker.on('dragend', (function (idx) {
        return function (evt) {
            moveLocationToLatLng(idx, evt.target.getLatLng());
        };
    })(index));

    marker.on('popupclose', (function (idx) {
        return function (evt) {
            evt.target.unbindPopup();
            evt.target.bindPopup(getSiteAttributeMarkup(location, index));
        };
    })(index));

    marker.bindPopup(getSiteAttributeMarkup(location, index));
    marker.bindTooltip(location.id, {
        permanent: displayModeControl.isPermanentTooltipsSelected()
    });
    markers.addLayer(marker);
}

function drawDepotSite(location, index) {
    var point = getLatLngOfLocation(location);

    var marker = L.marker(point, {
        draggable: true,
        icon: getCircleIcon(24, circleColors.orange),
        title: location.id
    }).addTo(map);

    marker.on('dragend', (function (idx) {
        return function (evt) {
            moveLocationToLatLng(idx, evt.target.getLatLng());
        };
    })(index));

    marker.on('popupclose', (function (idx) {
        return function (evt) {
            evt.target.unbindPopup();
            evt.target.bindPopup(getSiteAttributeMarkup(location, index));
        };
    })(index));

    marker.bindPopup(getSiteAttributeMarkup(location, index));
    marker.bindTooltip(location.id, {
        permanent: displayModeControl.isPermanentTooltipsSelected()
    });
    markers.addLayer(marker);
}

function getSiteAttributeMarkup(location, index) {
    var locationIdentifier = location.id.replace(/\s/g, '');
    var isCustomer = (location.$type == "CustomerSite");
    var result = '<h5>' + location.id + ':</h5><table class="xserver-parameter-control" style="text-align:center"><tr>\
        <td width="150px"><label  class="radio-inline"><input style="margin-top: 0px;" type="radio" id="' + locationIdentifier + '-customer-site"' + (isCustomer ? 'checked="checked"' : '') + ' name="' + locationIdentifier + '-type" onchange="onLocationTypeChange(' + index + ')"> Customer site</label></td>\
        <td width="150px"><label class="radio-inline"><input style="margin-top: 0px;" type="radio" id="' + locationIdentifier + '-depot-site"' + (isCustomer ? '' : 'checked="checked"') + ' name="' + locationIdentifier + '-type" onchange="onLocationTypeChange(' + index + ')"> Depot site</label></td></tr></table>\
        <pre style="width:300px" ><h5><b>Service time:</b></h5><table width="275px"><tr>\
        <td>Service time per stop:</td><td><input type="number" class="form-control" id="service-time-per-stop-' + locationIdentifier + '" value="' + (location.serviceTimePerStop ? location.serviceTimePerStop : 0) + '" min=0 max=100000 onchange="onSiteValueChange(' + index + ')"></td>\</tr>\
        <tr><td width="10px" colspan="2"><label class="checkbox-inline"><input style="margin-top: 0px;" type="checkbox" autocomplete="off" id="ignore-vehicle-factor-' + locationIdentifier + '" onchange="onSiteValueChange(' + index + ')" >  \<span data-toggle="tooltip" title="Ignore vehicle dependent service time factor for orders">Ignore vehicle dependent factor</span></label></td></tr></table></pre>\
        <div style="width:320px;max-height:325px; overflow:auto"><pre style="width:300px;margin-bottom:0px" ><table style="width:275px;"><tr><td width="225px"><h5><b><div class="pull-right tooltip-wrapper" data-title="Max. 3 opening intervals per site."><button type="button" class="btn btn-default" style="margin-top:-10px" data-toggle="button" id="add-interval-' + locationIdentifier + '" onclick="onAddOpeningInterval(' + index + ');this.blur()">Add interval</button></div>Opening intervals:</b></h5></td></tr>\
        <tr><td><div class="radio" style="margin:0px"><label style="font-weight:normal"><input type="radio" id="interval-type-duration-' + locationIdentifier + '" checked="checked" name="intervalType"> Start-duration interval</label></div></td></tr>\
        <tr><td><div class="radio" style="margin:0px"><label style="font-weight:normal"><input type="radio" id="interval-type-domain-' + locationIdentifier + '" name="intervalType" ' + (isPlanningHorizonDefined() ? '' : 'disabled=false') + ' title="The planning horizon must be set to use this option." id="time-domain-' + locationIdentifier + '"> Time domain</label></div></td></tr></table>\
        <div id="opening-intervals-div-' + locationIdentifier + '">' + getOpeningIntervalsMarkup(location, index, false) + '</div></pre></div>';
    return result;
}

//Todo: Use better check for validation of planning horizon.
function isPlanningHorizonDefined() {
    return document.getElementById("horizon-start").value != "" && document.getElementById("horizon-end").value != "";
}

function getOpeningIntervalsMarkup(location, locationIndex) {
    var locationId = location.id.replace(/\s/g, '');
    var result = '<ul class="list-group" style="width:275px; text-align:center; margin-bottom:0px" id="opening-intervals-' + locationId + '">';

    if (location.openingIntervals) {
        for (var i = 0; i < location.openingIntervals.length; i++) {
            var interval = location.openingIntervals[i];
            result += getIntervalMarkup(locationIndex, i, isTimeDomainInterval(interval));
        }
        result += '</ul>';
        if (location.openingIntervals.length < 10) {
            result += '';
        }
    } else {
        result += '<li class="list-group-item" id="always-open-' + locationId + '">Site is always open</li>';
        result += '</ul>';
    }
    return result;
}

function getIntervalMarkup(locationIndex, intervalIndex, isTimeDomain) {
    var location = requestLocations[locationIndex];
    var locationId = location.id.replace(/\s/g, '');

    var interval = (location.openingIntervals && location.openingIntervals[intervalIndex]);
    if (!interval)
        return '';

    if (isTimeDomain) {
        return getTimeDomainMarkup(interval, intervalIndex, locationIndex);
    } else {
        return getStartDurationIntervalMarkup(interval, intervalIndex, locationIndex);
    }
}

function isTimeDomainChecked(locationId) {
    var timeDomainRadioButton = $('#interval-type-domain-' + locationId)[0];
    return timeDomainRadioButton != null && timeDomainRadioButton.checked;
}

function isTimeDomainInterval(interval) {
    return interval.timeDomain != null;
}

function getStartDurationIntervalMarkup(interval, intervalIndex, locationIndex) {
    var location = requestLocations[locationIndex];
    var locationId = location.id.replace(/\s/g, '');
    var date = interval.start.substr(0, 10)
    var time = interval.start.substr(11, 8);

    return '<li class="list-group-item"><table><tr><td>Date:</td>\
    <td colspan="2"><input type="date" class="form-control" value="' + date + '" id="interval-' + intervalIndex + '-start-date-' + locationId + '" onchange="onSiteValueChange(' + locationIndex + ');"></td></tr><tr><td>Time:</td>\
    <td colspan="2"><input type="time" step="1" class="form-control" value="' + time + '" id="interval-' + intervalIndex + '-start-time-' + locationId + '" onchange="onSiteValueChange(' + locationIndex + ');"></td></tr><tr><td>Duration:</td>\
    <td><input type="number" class="form-control" min="0" max="100000" value="' + (interval.duration ? interval.duration : 0) + '" id="interval-' + intervalIndex + '-duration-' + locationId + '" onchange="onSiteValueChange(' + locationIndex + ');"></td><td> seconds</td>\</tr></table></li>';
}

function getTimeDomainMarkup(interval, intervalIndex, locationIndex) {
    var location = requestLocations[locationIndex];
    var locationId = location.id.replace(/\s/g, '');
    var timeDomain = interval.timeDomain;
    var time = getTime(timeDomain);
    var duration = getDuration(timeDomain);

    var content = '<li class="list-group-item"><table><tr><td>Time:</td>\
    <td colspan="2"><input type="time" step="1" class="form-control" value="' + time + '" id="interval-' + intervalIndex + '-start-time-' + locationId + '" onchange="onSiteValueChange(' + locationIndex + ');"></td></tr>\
    <tr><td>Duration:</td><td><input type="number" class="form-control" min="0" max="100000" value="' + duration + '" id="interval-' + intervalIndex + '-duration-' + locationId + '" onchange="onSiteValueChange(' + locationIndex + ');"></td><td> seconds</td></tr>\
    <tr><td colspan="3"><br>Repeat every week on day(s):</td></tr>\
    <tr><td colspan="3" style="height:50px" align="center" ><div class="btn-group" data-toggle="buttons">';
    content += getWeekDayCheckboxEntry(intervalIndex, locationIndex, locationId, "Sunday", "t1", timeDomain);
    content += getWeekDayCheckboxEntry(intervalIndex, locationIndex, locationId, "Monday", "t2", timeDomain);
    content += getWeekDayCheckboxEntry(intervalIndex, locationIndex, locationId, "Tuesday", "t3", timeDomain);
    content += getWeekDayCheckboxEntry(intervalIndex, locationIndex, locationId, "Wednesday", "t4", timeDomain);
    content += getWeekDayCheckboxEntry(intervalIndex, locationIndex, locationId, "Thursday", "t5", timeDomain);
    content += getWeekDayCheckboxEntry(intervalIndex, locationIndex, locationId, "Friday", "t6", timeDomain);
    content += getWeekDayCheckboxEntry(intervalIndex, locationIndex, locationId, "Saturday", "t7", timeDomain);
    content += '</div></td></tr></table></li>';
    return content;
}

function getWeekDayCheckboxEntry(intervalIndex, locationIndex, locationId, fullDayName, dayId, timeDomain) {
    var dayName = fullDayName.substr(0, 2);
    var dayNameShort = fullDayName.substr(0, 1);
    return '<label title="' + fullDayName + '" id="interval-' + intervalIndex + '-' + dayName + '-' + locationId + '-label" class="btn btn-default ' + getDayActiveProperty(dayId, timeDomain) + '"><input type="checkbox" autocomplete="off" ' + getDayCheckedProperty(dayId, timeDomain) + ' id="interval-' + intervalIndex + '-' + dayName + '-' + locationId + '" onchange="onSiteValueChange(' + locationIndex + ');">' + dayNameShort + '</label>';
}

function getDayCheckedProperty(day, timeDomain) {
    return isDayPartOfTimeDomain(day, timeDomain) ? "checked" : "";
}

function getDayActiveProperty(day, timeDomain) {
    return isDayPartOfTimeDomain(day, timeDomain) ? "active" : "";
}

/* Returns true if day string ("t1",...,"t7") is part of time domain.
 * day is "t1" (Sunday), "t2" (Monday),...,"t7" (Saturday)*/
function isDayPartOfTimeDomain(day, timeDomain) {
    return timeDomain.indexOf(day) >= 0;
}

function getTime(timeDomain) {
    var hours = getPartOfTime(timeDomain, "h");
    var minutes = getPartOfTime(timeDomain, "m");
    var seconds = getPartOfTime(timeDomain, "s");
    return hours.concat(":", minutes, ":", seconds);;
}

/* Returns part of start of GDFTimeDomain.
 *  part is "h" for hours, "m" for minutes, "s" for seconds. */
function getPartOfTime(timeDomain, part) {
    var startIndex = timeDomain.indexOf(part);
    return getPart(timeDomain, startIndex);
}

function getDuration(timeDomain) {
    var hours = getPartOfDuration(timeDomain, "h");
    var minutes = getPartOfDuration(timeDomain, "m");
    var seconds = getPartOfDuration(timeDomain, "s");
    var totalSeconds = parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseInt(seconds);
    return totalSeconds.toString();
}

/* Returns part of duration of GDFTimeDomain.
 *  part is "h" for hours, "m" for minutes, "s" for seconds. */
function getPartOfDuration(timeDomain, part) {
    var startIndex = timeDomain.indexOf(part, timeDomain.indexOf("{"));
    return getPart(timeDomain, startIndex);
}

//Helper function for getPartOfDuration() and getPartOfTime()
function getPart(timeDomain, startIndex) {
    if (startIndex < 0) {
        return "00";
    }
    //Add zero if part has just 1 character
    if (isLetter(timeDomain.substring(startIndex + 2, startIndex + 3)) ||
        timeDomain.substring(startIndex + 2, startIndex + 3) === ")" //end of start time
        ||
        timeDomain.substring(startIndex + 2, startIndex + 3) === "}") { //end of duration
        return "0".concat(timeDomain.substring(startIndex + 1, startIndex + 2));
    }
    return timeDomain.substring(startIndex + 1, startIndex + 3);
}

function isLetter(c) {
    return c.toLowerCase() != c.toUpperCase();
}

function onLocationTypeChange(locationIndex) {
    var location = requestLocations[locationIndex];
    if (location.$type == "CustomerSite") { // change customer to depot
        location.$type = "DepotSite";
    } else { // change depot to customer
        location.$type = "CustomerSite";
    }
    drawMarkers();
    buildRequest();
}

function onAddOpeningInterval(locationIndex) {
    var location = requestLocations[locationIndex];
    var locationId = location.id.replace(/\s/g, '');
    var intervalIndex = (location.openingIntervals && location.openingIntervals.length);

    var timeDomainIntervals = ['[(t2h10){h1}]', '[(t3h10){h1}]', '[(t4h10){h1}]'];
    var startDurationIntervals = ["2017-01-02T10:00:00+01:00", "2017-01-03T10:00:00+01:00", "2017-01-04T10:00:00+01:00"];

    if (!intervalIndex || intervalIndex == 0) { // first interval
        $('#always-open-' + locationId).remove();
        location.openingIntervals = [];
        if (isTimeDomainChecked(locationId)) {
            location.openingIntervals.push({
                "$type": "GDFTimeDomain",
                "timeDomain": timeDomainIntervals[0]
            });
        } else {
            location.openingIntervals.push({
                "$type": "StartDurationInterval",
                "start": startDurationIntervals[0],
                "duration": "1.0"
            });
        }
        $('#opening-intervals-div-' + locationId).empty();
        $('#opening-intervals-div-' + locationId).append(getOpeningIntervalsMarkup(location, locationIndex));
        $('#add-interval-' + locationId).addClass('active');
    } else {
        if (isTimeDomainChecked(locationId)) {
            location.openingIntervals.push({
                "$type": "GDFTimeDomain",
                "timeDomain": timeDomainIntervals[intervalIndex]
            });
        } else {
            location.openingIntervals.push({
                "$type": "StartDurationInterval",
                "start": startDurationIntervals[intervalIndex],
                "duration": "1.0"
            });
        }

        var list = $('#opening-intervals-' + locationId);
        list.append(getIntervalMarkup(locationIndex, intervalIndex, isTimeDomainChecked(locationId)));
        if (intervalIndex == 2) {
            $('#add-interval-' + locationId).prop('disabled', true);
            $('#interval-type-domain-' + locationId).prop('disabled', true);
            $('#interval-type-duration-' + locationId).prop('disabled', true);
            $('.tooltip-wrapper').tooltip({
                position: "bottom"
            });
        }
        $('#add-interval-' + locationId).removeClass('active');
    }
    onSiteValueChange(locationIndex);
    $('#add-interval-' + locationId).addClass('active');
}

/**ON CHANGE **/
function onSiteValueChange(locationIndex) {
    var location = requestLocations[locationIndex];
    var locationId = location.id.replace(/\s/g, '');

    location.serviceTimePerStop = $("#service-time-per-stop-" + locationId).val();
    location.ignoreVehicleDependentServiceTimeFactorForOrders = $('#ignore-vehicle-factor-' + locationId).is(':checked');

    if (location.openingIntervals) {
        for (var i = 0; i < location.openingIntervals.length; i++) {
            var interval = location.openingIntervals[i];
            if (isTimeDomainInterval(interval)) {
                interval.timeDomain = getTimeDomain(locationId, i);
            } else {
                interval.start = $('#interval-' + i + '-start-date-' + locationId).val() + 'T' + $('#interval-' + i + '-start-time-' + locationId).val();
                interval.duration = $('#interval-' + i + '-duration-' + locationId).val();
            }
        }
    }

    buildRequest();
}

function getTimeDomain(locationId, intervalIndex) {
    var timeDomain = "[(";
    timeDomain = addDaysToTimeDomain(timeDomain, locationId, intervalIndex);
    timeDomain = addStartToTimeDomain(timeDomain, locationId, intervalIndex);
    timeDomain = timeDomain.concat("){");
    timeDomain = addDurationToTimeDomain(timeDomain, locationId, intervalIndex);
    timeDomain = timeDomain.concat("}]");
    return timeDomain;
}

function addDaysToTimeDomain(timeDomain, locationId, intervalIndex) {
    if ($('#interval-' + intervalIndex + '-Su-' + locationId)[0].checked) {
        timeDomain = timeDomain.concat("t1");
    }
    if ($('#interval-' + intervalIndex + '-Mo-' + locationId)[0].checked) {
        timeDomain = timeDomain.concat("t2");
    }
    if ($('#interval-' + intervalIndex + '-Tu-' + locationId)[0].checked) {
        timeDomain = timeDomain.concat("t3");
    }
    if ($('#interval-' + intervalIndex + '-We-' + locationId)[0].checked) {
        timeDomain = timeDomain.concat("t4");
    }
    if ($('#interval-' + intervalIndex + '-Th-' + locationId)[0].checked) {
        timeDomain = timeDomain.concat("t5");
    }
    if ($('#interval-' + intervalIndex + '-Fr-' + locationId)[0].checked) {
        timeDomain = timeDomain.concat("t6");
    }
    if ($('#interval-' + intervalIndex + '-Sa-' + locationId)[0].checked) {
        timeDomain = timeDomain.concat("t7");
    }

    return timeDomain;
}

function addStartToTimeDomain(timeDomain, locationId, intervalIndex) {
    var start = $('#interval-' + intervalIndex + '-start-time-' + locationId)[0].value;
    var hours = parseInt(start.substring(0, 2));
    var minutes = parseInt(start.substring(3, 5));
    var seconds = parseInt(start.substring(6, 8));

    return addTimeToTimeDomain(timeDomain, hours, minutes, seconds);
}

function addDurationToTimeDomain(timeDomain, locationId, intervalIndex) {
    var totalSeconds = parseInt($('#interval-' + intervalIndex + '-duration-' + locationId)[0].value);
    var hours = parseInt(totalSeconds / 3600);
    totalSeconds = totalSeconds - (hours * 3600);
    var minutes = parseInt(totalSeconds / 60);
    totalSeconds = totalSeconds - (minutes * 60);
    var seconds = totalSeconds;

    return addTimeToTimeDomain(timeDomain, hours, minutes, seconds);
}

//Helper function for addStartToTimeDomain() and addDurationToTimeDomain()
function addTimeToTimeDomain(timeDomain, hours, minutes, seconds) {
    if (hours > 0) {
        timeDomain = timeDomain.concat('h' + hours);
    }
    if (minutes > 0) {
        timeDomain = timeDomain.concat('m' + minutes);
    }
    if (seconds > 0) {
        timeDomain = timeDomain.concat('s' + seconds);
    }

    return timeDomain;
}

function drawVehicleLocation(location, index) {
    var point = getLatLngOfLocation(location);

    var marker = L.marker(point, {
        draggable: true,
        icon: getCircleIcon(24, circleColors.blue),
        title: location.id
    }).addTo(map);

    marker.on('dragend', (function (idx) {
        return function (evt) {
            moveLocationToLatLng(idx, evt.target.getLatLng());
        };
    })(index));

    var locationIdentifier = location.id.replace(/\s/g, '');

    marker.bindPopup("<h5>" + location.id + '</h5>'); //TODO add attributes of location

    markers.addLayer(marker);
}


function getLatLngOfLocation(location) {
    var coordinateX = location.routeLocation.offRoadCoordinate.x;
    var coordinateY = location.routeLocation.offRoadCoordinate.y;
    var coordinate = L.latLng(coordinateY, coordinateX);
    return coordinate;
}

/**
 * Move the location with the specified id to the specified latlng.
 * @param {Number} id
 * @param {L.latLng} latlng
 */
function moveLocationToLatLng(index, latlng) {
    var location = requestLocations[index];
    location.routeLocation.offRoadCoordinate.x = latlng.lng;
    location.routeLocation.offRoadCoordinate.y = latlng.lat;
    drawMarkers();
    drawIndicators();
    sendRequest();
}

function drawIndicators() {
    orderIndicators.clearLayers();
    tourIndicators.clearLayers();
    tripIndicators.clearLayers();
    var value = $("input[name='display-options']:checked").val();
    switch (value) {
        case "orders":
            drawOrderIndicators();
            break;
        case "tours":
            drawTours();
            break;
        case "trips":
            drawTrips();
            break;
        default:
            drawOrderIndicators();
    }
}

function drawOrderIndicators() {
    var relations = getRelations();
    if (relations.length > 0) {
        orderIndicators.update(relations);
    }
}

function getRelations() {
    var result = [];
    for (var i = 0; i < requestOrders.length; i++) {
        var order = requestOrders[i];
        var pickupLatLng = getLatLngOfLocation(getLocationById(order.pickupLocationId));
        var deliveryLatLng = getLatLngOfLocation(getLocationById(order.deliveryLocationId));
        var orderLatLngs = [pickupLatLng, deliveryLatLng];
        result.push({
            "latLngs": orderLatLngs,
            "order": order
        });
    }
    return result;
}

function onOrderValueChange(orderIndex) {
    var order = requestOrders[orderIndex];
    var orderIdentifier = order.id.replace(/\s/g, '');
    order.serviceTimeForPickup = $('#service-time-pickup-' + orderIdentifier).val();
    order.serviceTimeForDelivery = $('#service-time-delivery-' + orderIdentifier).val();
    order.requiredVehicleEquipment = [];
    if ($('#required-vehicle-equipment-' + orderIdentifier).val() != "") {
        order.requiredVehicleEquipment.push($('#required-vehicle-equipment-' + orderIdentifier).val());
    }

    if (order.quantities) {
        for (var i = 0; i < order.quantities.length; i++) {
            order.quantities[i] = $('#quantity-' + i + '-' + orderIdentifier).val();
        }
    }
    redrawOrderTable();
    buildRequest();
}

function onOrderValueSidebarChange(orderIndex) {
    var order = requestOrders[orderIndex];
    var orderIdentifier = order.id.replace(/\s/g, '');
    order.serviceTimeForPickup = $('#service-time-pickup-sidebar-' + orderIdentifier).val();
    order.serviceTimeForDelivery = $('#service-time-delivery-sidebar-' + orderIdentifier).val();
    order.requiredVehicleEquipment = [];
    if ($('#required-vehicle-equipment-sidebar-' + orderIdentifier).val() != "") {
        order.requiredVehicleEquipment.push($('#required-vehicle-equipment-sidebar-' + orderIdentifier).val());
    }

    if (order.quantities) {
        for (var i = 0; i < order.quantities.length; i++) {
            order.quantities[i] = $('#quantity-sidebar-' + i + '-' + orderIdentifier).val();
        }
    }
    buildRequest();
}

function getLocationById(id) {
    for (var i = 0; i < requestLocations.length; i++) {
        if (requestLocations[i].id === id) {
            return requestLocations[i];
        }
    }
    return null;
}

function getLocationSelectMarkup(orderIndex, selectedLocation, selectId, onchange) {
    var result = '<select id="' + selectId + '" onchange="' + onchange + '(' + orderIndex + ');" class="form-control">';
    for (var i = 0; i < requestLocations.length; i++) {
        result += '<option value="' + requestLocations[i].id + '" ' + (requestLocations[i].id == selectedLocation ? ' selected ' : '') + '>' + requestLocations[i].id + '</option>';
    }
    result += '</select>';
    return result;
}

function getVehicleLocationSelectMarkup(orderIndex, selectedLocation, selectId, onchange) {
    var result = '<select id="' + selectId + '" onchange="' + onchange + '(' + orderIndex + ');" class="form-control">';
    result += '<option value="" >Not specified</option>';
    for (var i = 0; i < requestLocations.length; i++) {
        result += '<option value="' + requestLocations[i].id + '" ' + (requestLocations[i].id == selectedLocation ? ' selected ' : '') + '>' + requestLocations[i].id + '</option>';
    }
    result += '</select>';
    return result;
}

function getVehicleListContent() {
    var content = '';
    var openedPanelIndex = vehicleWasAdded ? requestVehicles.length - 1 : 0;
    for (var i = 0; i < requestVehicles.length; i++) {
        var vehicle = requestVehicles[i];
        var groupName = vehicle.ids[0].substr(0, vehicle.ids[0].indexOf('-'));
        var vehicleId = vehicle.ids[0].replace(/\s/g, '');
        content += '<div class="panel panel-default"><div class="panel-heading"><h4 class="panel-title"><a data-toggle="collapse" data-parent="#vehicle-control-list" href="#collapsible-item-' + vehicleId + '-' + i + '">' + groupName + '</a></h4></div><div id="collapsible-item-' + vehicleId + '-' + i + '" class="panel-collapse collapse ' + (i == openedPanelIndex ? "in" : "") + '"><div class="panel-body">\
        <table><tr><td width="200px">Number of instances:</td><td><input class="form-control" id="vehicle-number-' + vehicleId + '"  step="1" type="number" value="' + vehicle.ids.length + '" min="1" onchange="onVehicleValueChange(' + i + ')"></td></tr>\
        <tr><td>Start location:</td><td>' + getVehicleLocationSelectMarkup(i, vehicle.startLocationId, "vehicle-start-" + vehicleId, "onVehicleValueChange") + '</td></tr>\
        <tr><td>End location:</td><td>' + getVehicleLocationSelectMarkup(i, vehicle.endLocationId, "vehicle-end-" + vehicleId, "onVehicleValueChange") + '</td></tr>\
        <tr><td>Service time factor for orders:</td><td><input class="form-control" id="vehicle-service-time-factor-' + vehicleId + '" step="0.1" type="number" value="' + vehicle.serviceTimeFactorForOrders + '" min="1" onchange="onVehicleValueChange(' + i + ')"></td></tr>\
        <tr><td>Service time per stop:</td><td><input class="form-control" id="vehicle-service-time-per-stop-' + vehicleId + '" type="number" step="1" value="' + vehicle.serviceTimePerStop + '" min="0" onchange="onVehicleValueChange(' + i + ')"></td></tr>\
        <tr><td><span data-toggle="tooltip" title="Enter a string to define one vehicle equipment">Equipment:</span></td><td><input class="form-control" id="vehicle-equipment-' + vehicleId + '" type="text" value="' + (vehicle.equipment ? vehicle.equipment[0] : "") + '" onchange="onVehicleValueChange(' + i + ')"></td></tr></table>\
        <div id="quantities-div-' + vehicleId + '">' + getQuantitiesMarkup(vehicle, i) + '</div></div></div></div>';
    }

    content += '<button type="button" style="margin-top:5px; height:37px; text-align:left; font-family:Arial; font-size:16px" class="btn panel-default btn-block" id="add-vehicle" onclick="onAddVehicle()"><i class="fa fa-plus" ></i>  Add vehicle</button>'
    return content;
}

function getQuantitiesMarkup(vehicle, index) {
    var vehicleId = vehicle.ids[0].replace(/\s/g, '');
    var result = 'Maximum quantity scenario: <br><ul class="list-group" style="text-align:center; margin-bottom:0px" id="quantities-' + vehicleId + '">';
    if (vehicle.maximumQuantityScenarios) {
        for (var i = 0; i < vehicle.maximumQuantityScenarios[0].quantities.length; i++) {
            result += getQuantityMarkup(index, i);
        }
        result += '</ul>';
    } else {
        result += '<li class="list-group-item" id="quantities-not-specified-' + vehicleId + '">Max. Quantity Scenario not specified</li>';
        result += '</ul>';
    }
    return result;
}

function getQuantityMarkup(vehicleIndex, quantityIndex) {
    var vehicle = requestVehicles[vehicleIndex];;
    var vehicleId = vehicle.ids[0].replace(/\s/g, '');
    var quantity = (vehicle.maximumQuantityScenarios && vehicle.maximumQuantityScenarios[0].quantities[quantityIndex]);

    if (!quantity)
        return '';

    return '<li class="list-group-item"><table><tr><td width="200px">Transport quantity units:</td>\
    <td><input type="number" class="form-control" min="0" max="100000" value="' + (quantity ? quantity : 0) + '" id="quantity-' + quantityIndex + '-' + vehicleId + '" onchange="onVehicleValueChange(' + vehicleIndex + ');"></td></tr></table></li>';
}

function onVehicleValueChange(index) {
    var vehicle = requestVehicles[index];
    var name = vehicle.ids[0];
    var id = name.replace(/\s/g, '');
    var numberOfVehicles = $('#vehicle-number-' + id).val();
    if (numberOfVehicles != vehicle.ids.length) {
        vehicle.ids = [];
        var prefix = name.substr(0, name.indexOf('-'));
        for (var i = 0; i < numberOfVehicles; i++) {
            vehicle.ids.push(prefix + "- Instance " + (i + 1));
        }
    }

    if ($('#vehicle-start-' + id).val() === '') {
        delete vehicle.startLocationId;
    } else {
        vehicle.startLocationId = $('#vehicle-start-' + id).val();
    }
    if ($('#vehicle-end-' + id).val() === '') {
        delete vehicle.endLocationId;
    } else {
        vehicle.endLocationId = $('#vehicle-end-' + id).val();
    }

    vehicle.serviceTimeFactorForOrders = $('#vehicle-service-time-factor-' + id).val();
    vehicle.serviceTimePerStop = $('#vehicle-service-time-per-stop-' + id).val();
    vehicle.equipment = [];
    if ($('#vehicle-equipment-' + id).val() != "") {
        vehicle.equipment.push($('#vehicle-equipment-' + id).val());
    }

    if (vehicle.maximumQuantityScenarios) {
        var quantities = vehicle.maximumQuantityScenarios[0].quantities;
        for (var i = 0; i < quantities.length; i++) {
            quantities[i] = $('#quantity-' + i + '-' + id).val();
        }
    }

    buildRequest();
}

function onAddVehicle() {
    vehicleWasAdded = true;
    requestVehicles.push({
        "ids": [
            "Vehicle " + (requestVehicles.length + 1) + " - Instance 1"
        ],
        "maximumQuantityScenarios": [{
            "quantities": [
                1, 1, 1
            ]
        }],
        "serviceTimeFactorForOrders": 2,
        "serviceTimePerStop": 1
    });

    redrawVehicleList();
}

function getOrderListContent() {
    var content = '';
    var openedPanelIndex = orderWasAdded ? requestOrders.length - 1 : 0;
    for (var i = 0; i < requestOrders.length; i++) {
        var order = requestOrders[i];
        var orderId = order.id.replace(/\s/g, '');
        content += '<div class="panel panel-default"><div class="panel-heading"><h4 class="panel-title"><a data-toggle="collapse" data-parent="#order-control-list" href="#collapsible-item-' + orderId + '">' + order.id + '</a></h4></div><div id="collapsible-item-' + orderId + '" class="panel-collapse collapse ' + (i == openedPanelIndex ? "in" : "") + '"><div class="panel-body">\
            <table><tr><td width="200px">Pickup location:</td><td>' + getLocationSelectMarkup(i, order.pickupLocationId, "select-pickup-" + orderId, "onOrderLocationChange") + '</td></tr>\
            <tr><td width="200px">Delivery location:</td><td>' + getLocationSelectMarkup(i, order.deliveryLocationId, "select-delivery-" + orderId, "onOrderLocationChange") + '</td></tr><tr>\
            <td><span data-toggle="tooltip" title="Service time for pickup">Service time pickup:</span></td>\
            <td><input type="number" class="form-control" id="service-time-pickup-sidebar-' + orderId + '" value="' + (order.serviceTimeForPickup ? order.serviceTimeForPickup : 0) + '" min=0 max=100000 onchange="onOrderValueSidebarChange(' + i + ')"></td></tr><tr>\
            <td><span data-toggle="tooltip" title="Service time for delivery">Service time delivery:</span></td>\
            <td><input type="number" class="form-control" id="service-time-delivery-sidebar-' + orderId + '" value="' + (order.serviceTimeForDelivery ? order.serviceTimeForDelivery : 0) + '" min=0 max=100000 onchange="onOrderValueSidebarChange(' + i + ')"></td></tr>\
            <td><span data-toggle="tooltip" title="Enter a string to define one required equipment">Required vehicle equipment:</span></td><td><input type="text" class="form-control" id="required-vehicle-equipment-sidebar-' + orderId + '" value="' + (order.requiredVehicleEquipment ? order.requiredVehicleEquipment[0] : "") + '" onchange="onOrderValueSidebarChange(' + i + ')"></td></tr>\
            </table>';
        content += '<div id="quantities-div-sidebar-' + orderId + '">' + getOrderQuantitiesMarkup(order, i) + '</div>';
        content += '</div></div></div>';
    }
    content += '<button type="button" style="margin-top:5px; height:37px; text-align:left; font-family:Arial; font-size:16px" class="btn panel-default btn-block" id="add-order" onclick="onAddOrder()"><i class="fa fa-plus" ></i>  Add order</button>';
    return content;
}

function getOrderQuantitiesMarkup(order, index) {
    var orderIdentifier = order.id.replace(/\s/g, '');
    var result = 'Order quantities: <br><ul class="list-group" style="text-align:center; margin-bottom:0px" id="quantities-sidebar-' + orderIdentifier + '">';

    if (order.quantities) {
        for (var i = 0; i < order.quantities.length; i++) {
            result += getOrderQuantityMarkup(index, i);
        }
        result += '</ul>';
    } else {
        result += '<li class="list-group-item" id="quantities-not-specified-sidebar-' + orderIdentifier + '">Quantities are not specified</li>';
        result += '</ul>';
    }
    return result;
}

function getOrderQuantityMarkup(orderIndex, quantityIndex) {
    var order = requestOrders[orderIndex];
    var orderIdentifier = order.id.replace(/\s/g, '');
    var quantity = (order.quantities && order.quantities[quantityIndex]);

    if (!quantity)
        return '';

    return '<li class="list-group-item"><table><tr><td width="200px">Transport quantity units:</td>\
    <td><input type="number" class="form-control" min="0" max="100000" value="' + (quantity ? quantity : 0) + '" id="quantity-sidebar-' + quantityIndex + '-' + orderIdentifier + '" onchange="onOrderValueSidebarChange(' + orderIndex + ');"></td></tr></table></li>';
}

function onOrderLocationChange(orderIndex) {
    var order = requestOrders[orderIndex];
    var orderId = order.id.replace(/\s/g, '');

    order.pickupLocationId = $('#select-pickup-' + orderId).val();
    order.deliveryLocationId = $('#select-delivery-' + orderId).val();

    drawOrderIndicators();
    buildRequest();
}

function onAddOrder(pickup, delivery) {
    orderWasAdded = true;
    var pickupLocation = (pickup || requestLocations[0].id);
    var deliveryLocation = (delivery || requestLocations[1].id);

    requestOrders.push({
        "$type": "PickupDeliveryOrder",
        "id": "Order " + (requestOrders.length + 1),
        "quantities": [
            1, 1, 1
        ],
        "pickupLocationId": pickupLocation,
        "serviceTimeForPickup": 1,
        "deliveryLocationId": deliveryLocation,
        "serviceTimeForDelivery": 2
    });

    redrawOrderTable();
    drawOrderIndicators();
    sendRequest();
}

/**
 * Send a request to the xClusterClient.
 */
function planTours() {
    xTourClient.planTours(sampleRequest, planToursCallback, 20000);
}

/**
 * Handle response to the sent request.
 * @param {responseObject} result
 * @param {exceptionObject} err
 */
function planToursCallback(result, err) {
    if (errorControl)
        map.removeControl(errorControl);
    errorControl = null;

    if (err) {
        errorControl = new L.Control.ErrorControl({
            error: err
        }).addTo(map);
        return;
    }

    if (result) {
        sampleResponse = result;

        responseTours = result.tours;
        responseTourReports = result.tourReports;
        updateResponseTrips();
        costReportControl.update(sampleResponse.costReport);
        if (isFirstRequest) {
            displayModeControl.update("trips");
            isFirstRequest = false;
        }

        drawIndicators();
        redrawTourList();
    }
    progressControl.reset();
    progressControl.hide();

    $('.leaflet-container').css('cursor', 'default');
    map.on('click', onMapClick);
}

function updateResponseTrips() {
    responseTrips = [];
    for (var i = 0; i < responseTours.length; i++) {
        var trips = responseTours[i].trips;
        for (var j = 0; j < trips.length; j++) {
            responseTrips.push(trips[j]);
        }
    }
}

/**
 * Draw tours from current request/response.
 */
function drawTours() {
    orderIndicators.clearLayers();
    tripIndicators.clearLayers();
    tourIndicators.update(getTourRelations());
    //drawOrderIndicators();
}

function getTourRelations() {
    var result = [];

    for (var i = 0; i < responseTours.length; i++) {
        var tour = responseTours[i];
        var tourLatLngs = [];
        if (tour.vehicleStartLocationId) {
            tourLatLngs.push(getLatLngOfLocation(getLocationById(tour.vehicleStartLocationId)));
        }
        var trips = tour.trips;
        for (var j = 0; j < trips.length; j++) {
            var stops = trips[j].stops;
            for (var k = 0; k < stops.length; k++) {
                tourLatLngs.push(getLatLngOfLocation(getLocationById(stops[k].locationId)));
            }
        }
        if (tour.vehicleEndLocationId) {
            tourLatLngs.push(getLatLngOfLocation(getLocationById(tour.vehicleEndLocationId)));
        }
        result.push({
            "latLngs": tourLatLngs,
            "tour": tour,
            "costReport": getTourCostReportByVehicleId(tour.vehicleId)
        });
    }
    return result;
}

function getTourCostReportByVehicleId(vehicleId) {
    var tourReports = sampleResponse.tourReports;
    for (var i = 0; i < tourReports.length; i++) {
        if (tourReports[i].vehicleId === vehicleId)
            return tourReports[i].costReport;
    }
}

/**
 * Draw all trips from current request/response.
 */
function drawTrips() {
    orderIndicators.clearLayers();
    tourIndicators.clearLayers();
    tripIndicators.update(getTripRelations());
    //drawOrderIndicators();
}

function getTripRelations() {
    var tours = sampleResponse.tours;
    var result = [];

    for (var i = 0; i < tours.length; i++) {
        var tour = tours[i];
        var trips = tour.trips;
        for (var j = 0; j < trips.length; j++) {
            var trip = trips[j];
            var tripLatLngs = [];
            if (j == 0 && tour.vehicleStartLocationId && getLocationById(trip.stops[0].locationId).$type != "DepotSite") {
                tripLatLngs.push(getLatLngOfLocation(getLocationById(tour.vehicleStartLocationId)));
            }
            var stops = trip.stops;
            if (j > 0) {
                var locationOfFirstStop = getLocationById(stops[0].locationId);
                if (locationOfFirstStop.$type != "DepotSite") {
                    var lastStopOfPrevTrip = trips[j - 1].stops[trips[j - 1].stops.length - 1];
                    tripLatLngs.push(getLatLngOfLocation(getLocationById(lastStopOfPrevTrip.locationId)));
                }
            }
            for (var k = 0; k < stops.length; k++) {
                tripLatLngs.push(getLatLngOfLocation(getLocationById(stops[k].locationId)));
            }
            var locationOfLastStop = getLocationById(stops[stops.length - 1].locationId);
            if (j < trips.length - 1 && locationOfLastStop.$type != "DepotSite") {
                var firstStopOfNextTrip = trips[j + 1].stops[0];
                tripLatLngs.push(getLatLngOfLocation(getLocationById(firstStopOfNextTrip.locationId)));
            }
            if (j == trips.length - 1 && tour.vehicleEndLocationId && locationOfLastStop.$type != "DepotSite") {
                tripLatLngs.push(getLatLngOfLocation(getLocationById(tour.vehicleEndLocationId)));
            }

            result.push({
                "latLngs": tripLatLngs,
                "trip": trip,
                "name": tour.vehicleId + ": Trip " + (j + 1),
                "costReport": getTripCostReport(tour.vehicleId, trip.id)
            });
        }
    }
    return result;
}

function getTripCostReport(vehicleId, tripId) {
    var tourReports = sampleResponse.tourReports;
    for (var i = 0; i < tourReports.length; i++) {
        if (tourReports[i].vehicleId === vehicleId) {
            var tripReports = tourReports[i].tripReports;
            for (var j = 0; j < tripReports.length; j++) {
                if (tripReports[j].tripId === tripId) {
                    return tripReports[j].costReport;
                }
            }
        }
    }
}

function getTourListContent() {
    var content = '';
    if (!responseTours)
        return content;

    for (var i = 0; i < responseTours.length; i++) {
        var tour = responseTours[i];
        var costReport = getTourCostReportByVehicleId(tour.vehicleId);
        var groupName = tour.vehicleId.substr(0, tour.vehicleId.indexOf('-') - 1);
        var vehicleName = tour.vehicleId.substring(tour.vehicleId.indexOf('-') + 2);
        content += '<div class="panel panel-default"><div class="panel-heading"><h4 class="panel-title"><a data-toggle="collapse" href="#collapsible-item-' + i + '">Tour of ' + tour.vehicleId + '</a></h4></div><div id="collapsible-item-' + i + '" class="panel-collapse collapse ' + (i == 0 ? "in" : "") + '"><div class="panel-body">\
        <b>Dates: </b><table width="100%" style="margin-bottom:20px">\
            <tr><td>Start date:</td><td style="text-align:right;">' + prettyPrintDate(getTourStart(i)) + '</td></tr>\
            <tr><td>End date:</td><td style="text-align:right;">' + prettyPrintDate(getTourEnd(i)) + '</td></tr>\
        </table>\
        <b>Cost report:</b><table width="100%" style="margin-bottom:20px">\
            <tr><td>Distance</td><td style="text-align:right;">' + formatDistance(costReport.distance) + '</td></tr>\
            <tr><td>Traveltime</td><td style="text-align:right;">' + formatTime(costReport.travelTime) + '</td></tr>\
            <tr><td>Drivingtime</td><td style="text-align:right;">' + formatTime(costReport.drivingTime) + '</td></tr>\
        </table>';
        content += '<b>Locations: </b>' + getTourStops(tour);
        content += getTripMarkupForTour(i);
        content += '</div></div></div>';
    }
    return content;
}

function getTourStart(tourIndex) {
    return responseTourReports[tourIndex].tourEvents[0].startTime;
}

function getTourEnd(tourIndex) {
    var tourEvents = responseTourReports[tourIndex].tourEvents;
    return tourEvents[tourEvents.length - 1].startTime;
}

/**
 * Return date in format DD.MM.YYYY at hh:mm:ss
 **/
function prettyPrintDate(dateString) {
    var result = '';
    result += dateString.substr(8, 2) + "."; // day
    result += dateString.substr(5, 2) + "."; // month
    result += dateString.substr(0, 4) + " at "; // year
    result += dateString.substr(11, 8); // time
    return result;
}

function getTourStops(tour) {
    var tourStops = '';

    if (tour.vehicleStartLocationId && getLocationById(tour.trips[0].stops[0].locationId).$type != "DepotSite") {
        tourStops += tour.vehicleStartLocationId + ' \u279F ';
    }
    for (var i = 0; i < tour.trips.length; i++) {
        var trip = tour.trips[i];
        var tripStops = '';
        for (var j = 0; j < trip.stops.length; j++) {
            if (i > 0 && j == 0) {
                var locationOfFirstStop = getLocationById(trip.stops[0].locationId);
                var lastStopOfPrevTrip = tour.trips[i - 1].stops[tour.trips[i - 1].stops.length - 1];
                if (lastStopOfPrevTrip.locationId == trip.stops[0].locationId) {
                    continue;
                }
            }

            tripStops += trip.stops[j].locationId;
            if (i == tour.trips.length - 1 && j == trip.stops.length - 1)
                break;
            tripStops += ' \u279F ';
        }

        tourStops += tripStops;
    }

    var trip = tour.trips[tour.trips.length - 1];
    var locationOfLastStop = getLocationById(trip.stops[trip.stops.length - 1].locationId);
    if (tour.vehicleEndLocationId && locationOfLastStop.$type != "DepotSite") {
        tourStops += ' \u279F ' + tour.vehicleEndLocationId;
    }

    return tourStops;
}

function getTripMarkupForTour(tourIndex) {
    var tour = responseTours[tourIndex];
    var result = '<div style="display: block; max-height:670px; overflow-y:auto; overflow-x: hidden; margin-top:10px"><div class="panel-group" id="trip-list-' + tour.vehicleId + '" style="width=362px; margin-bottom:0px; ">';
    var startEventSearchFromIndex = 0;
    for (var i = 0; i < tour.trips.length; i++) {
        var trip = tour.trips[i];
        var tripName = tour.vehicleId.replace(/\s/g, '') + i;
        var costReport = getTripCostReport(tour.vehicleId, trip.id);
        var tripStart = getTripStart(tourIndex, startEventSearchFromIndex);
        var tripEnd = getTripEnd(tourIndex, tripStart[1]);
        result += '<div class="panel panel-default"><div class="panel-heading"><h4 class="panel-title"><a data-toggle="collapse" data-parent="trip-list-' + tour.vehicleId + '" href="#collapsible-item-trip-' + tripName + '">Trip ' + (i + 1) + '</a></h4></div><div id="collapsible-item-trip-' + tripName + '" class="panel-collapse collapse"><div class="panel-body">\
        <b>Dates: </b><table width="100%" style="margin-bottom:20px">\
            <tr><td>Start date:</td><td style="text-align:right;">' + prettyPrintDate(tripStart[0]) + '</td></tr>\
            <tr><td>End date:</td><td style="text-align:right;">' + prettyPrintDate(tripEnd[0]) + '</td></tr>\
        </table>\
        <b>Cost report:</b><table width="100%" style="margin-bottom:10px">\
            <tr><td>Distance</td><td style="text-align:right;">' + formatDistance(costReport.distance) + '</td></tr>\
            <tr><td>Traveltime</td><td style="text-align:right;">' + formatTime(costReport.travelTime) + '</td></tr>\
            <tr><td>Drivingtime</td><td style="text-align:right;">' + formatTime(costReport.drivingTime) + '</td></tr>\
        </table> <b> Locations: </b>';
        startEventSearchFromIndex = tripEnd[1];
        var tripStops = '';

        if (i == 0 && tour.vehicleStartLocationId && getLocationById(trip.stops[0].locationId).$type != "DepotSite") {
            tripStops += tour.vehicleStartLocationId + ' \u279F ';
        }

        if (i > 0) {
            var locationOfFirstStop = getLocationById(trip.stops[0].locationId);
            if (locationOfFirstStop.$type != "DepotSite") {
                var lastStopOfPrevTrip = tour.trips[i - 1].stops[tour.trips[i - 1].stops.length - 1];
                tripStops += lastStopOfPrevTrip.locationId + ' \u279F ';
            }
        }

        for (var j = 0; j < trip.stops.length; j++) {
            tripStops += trip.stops[j].locationId;
            if (j == trip.stops.length - 1)
                break;
            tripStops += ' \u279F ';
        }

        var locationOfLastStop = getLocationById(trip.stops[trip.stops.length - 1].locationId);
        if (i < tour.trips.length - 1 && locationOfLastStop.$type != "DepotSite") {
            var firstStopOfNextTrip = tour.trips[i + 1].stops[0];
            tripStops += ' \u279F ' + firstStopOfNextTrip.locationId;
        }

        if (i == tour.trips.length - 1 && tour.vehicleEndLocationId && locationOfLastStop.$type != "DepotSite") {
            tripStops += ' \u279F ' + tour.vehicleEndLocationId;
        }
        result += tripStops + '</div></div></div>';
    }

    result += '</div></div>';

    return result;
}

//Returns the start date string and the index of the first trip start event after the event with startEventSearchFromIndex of tour with tourIndex.
function getTripStart(tourIndex, startEventSearchFromIndex) {
    var tourEvents = responseTourReports[tourIndex].tourEvents;
    for (var i = startEventSearchFromIndex; i < tourEvents.length; i++) {
        var event = tourEvents[i];
        for (var j = 0; j < event.eventTypes.length; j++) {
            if (event.eventTypes[j] == "TRIP_START") {
                return [event.startTime, i];
            }
        }
    }
    return ["Trip start error.", 0];
}

//Returns the end date string of the first trip end event after the event with startEventSearchFromIndex of tour with tourIndex.
function getTripEnd(tourIndex, startEventSearchFromIndex) {
    var tourEvents = responseTourReports[tourIndex].tourEvents;
    for (var i = startEventSearchFromIndex + 1; i < tourEvents.length; i++) {
        var event = tourEvents[i];
        for (var j = 0; j < event.eventTypes.length; j++) {
            if (event.eventTypes[j] == "TRIP_END") {
                return [event.startTime, i];
            }
        }
    }
    return ["Trip end error.", 0];
}

function toggleMaximumTravelTimePerTour() {
    if ($('#maximum-travel-time-per-tour-enabled').is(':checked')) {
        $("#maximum-travel-time-per-tour").prop('disabled', false);
    } else {
        $("#maximum-travel-time-per-tour").prop('disabled', true);
    }
    sendRequest()
}


function toggleMaximumDrivingTimePerTour() {
    if ($('#maximum-driving-time-per-tour-enabled').is(':checked')) {
        $("#maximum-driving-time-per-tour").prop('disabled', false);
    } else {
        $("#maximum-driving-time-per-tour").prop('disabled', true);
    }
    sendRequest()
}

/**
 * Configures and sends a xTour request.
 */
function sendRequest() {
    $('.leaflet-container').css('cursor', 'wait');

    if (distanceMatrixId) {
        xDimaClient.deleteDistanceMatrix({
            "id": distanceMatrixId
        });
        distanceMatrixId = null;
    }

    if ($("#roadDistances").is(':checked')) {
        // start calculation of new dima
        map.off('click', onMapClick);
        xDimaClient.startCreateDistanceMatrix(getDimaRequest(), function (job, err) {
            if (job == null) return;
            progressControl.show(true);
            timerId = setInterval(watch, 300, job.id, ++lastSentDimaOpSeqNo);
        }, 0);
    } else {
        distanceMode = {
            "$type": "DirectDistance"
        };
        buildRequest();
    }
}

function watch(jobId, seqNo) {
    if (jobId == "") return;
    xDimaClient.watchJob({
        id: jobId,
        progressUpdatePeriod: 100,
        maximumPollingPeriod: 100
    }, function (job, err) {
        if (job == null) {
            clearInterval(timerId);
            return;
        }
        if (job.progress != null) {
            progressControl.update(job.progress);
        }

        if (err) {
            clearInterval(timerId);
            progressControl.hide();
            var dimaErrorControl = new L.Control.ErrorControl({
                error: err
            }).addTo(map);
            xdimaClient.deleteJob({
                id: jobId
            }, function () {}, 10);
        } else if (job.status == "FAILED") {
            clearInterval(timerId);
            dimaCallback(jobId, null, seqNo);
        } else if (job.status == "SUCCEEDED") {
            clearInterval(timerId);
            progressControl.updateProgress(100);
            dimaCallback(jobId, err, seqNo);
        }

    }, 0);
}

function dimaCallback(jobId, err, seqNo) {
    if (seqNo < lastestReceivedOpSeqNo) return;
    lastestReceivedOpSeqNo = seqNo;

    if (err) return;

    xDimaClient.fetchDistanceMatrixResponse(jobId, function (result, err) {
        xDimaClient.deleteJob({
            id: jobId
        }, function () {}, 10);

        if (result) {
            distanceMatrixId = result.summary.id;
            distanceMode = {
                "$type": "ExistingDistanceMatrix",
                "id": distanceMatrixId
            };
        }
        buildRequest();
    }, 2000);

}

/**
 * Builds and sends a request with the current configuration.
 */
function buildRequest() {
    map.off('click', onMapClick);
    if ((requestLocations && requestLocations.length > 0) &&
        (requestOrders && requestOrders.length > 0) &&
        (requestVehicles && requestVehicles.length > 0)) {

        $('.leaflet-container').css('cursor', 'wait');
        sampleRequest = {
            "locations": requestLocations,
            "orders": requestOrders,
            "fleet": {
                "vehicles": requestVehicles
            },
            "planToursOptions": getPlanToursOptions(),
            "distanceMode": distanceMode
        };
        progressControl.setContent("Planning tours");
        planTours();
    } else {
        $('.leaflet-container').css('cursor', 'default');
    }
}

/**
 * Build an xDima Request.
 * @return {Object} xDima request.
 */
function getDimaRequest() {
    var startLocations = [];
    for (var i = 0; i < requestLocations.length; i++) {
        startLocations.push(requestLocations[i].routeLocation);
    }
    return {
        "startLocations": startLocations
    };
}


/**
 * Behaviour when scenario changes.
 */
function onScenarioChange() {
    responseTours = [];
    responseTourReports = [];
    responseTrips = [];
    var scenario = "Two tours";
    //var scenario = $("#scenario-selection").val();

    requestLocations = scenarioLoader.getCopyOfScenarioLocations(scenario);
    requestOrders = scenarioLoader.getCopyOfScenarioOrders(scenario);
    requestVehicles = scenarioLoader.getCopyOfScenarioFleet(scenario);

    //redrawSidebarContent();
    drawMarkers();
    sendRequest();
}


function getPlanToursOptions() {
    var planToursOptions = {
        "$type": "PlanToursOptions",
        "restrictions": {
            "$type": "TourRestrictions",
            "singleTripPerTour": $('#singleTripPerTour').is(':checked'),
            "singleDepotPerTour": $('#singleDepotPerTour').is(':checked'),
        },
    };

    if (isPlanningHorizonDefined()) {
        planToursOptions.planningHorizon = {
            "$type": "StartEndInterval",
            "start": $('#horizon-start')[0].value + "T00:00:00+01:00",
            "end": $('#horizon-end')[0].value + "T00:00:00+01:00"
        }
    }

    if ($('#maximum-travel-time-per-tour-enabled').is(':checked')) {
        planToursOptions.restrictions.maximumTravelTimePerTour = $('#maximum-travel-time-per-tour').val();
    }

    if ($('#maximum-driving-time-per-tour-enabled').is(':checked')) {
        planToursOptions.restrictions.maximumDrivingTimePerTour = $('#maximum-driving-time-per-tour').val();
    }

    planToursOptions.calculationMode = $('#calculation-mode').val();

    return planToursOptions;
}

/**
 * Extend functionality of Leaflet Control
 */
L.Control.DisplayModeControl = L.Control.extend({
    options: {
        'position': 'topright'
    },

    // on adding the control to the specified map
    onAdd: function (map) {
        this._container = document.getElementById('display-mode-control');

        if (L.DomEvent) {
            L.DomEvent.disableClickPropagation(this._container);
            L.DomEvent.disableScrollPropagation(this._container);
        }
        return this._container;
    },

    // show other display mode
    update: function (option) {
        var checked = $("input[name='display-options']:checked").val();
        $("input[name=display-options][value='" + checked + "']").prop("checked", false);
        $('#display-options-' + checked).removeClass("active");

        $("input[name=display-options][value='" + option + "']").prop("checked", true);
        $('#display-options-' + option).addClass("active");
        drawIndicators();
    },

    isPermanentTooltipsSelected: function () {
        return $('#permanent-marker-tooltips').is(':checked');
    },

    clear: function () {
        var checked = $("input[name='display-options']:checked").val();
        $("input[name=display-options][value='" + checked + "']").prop("checked", false);
        $('#display-options-' + checked).removeClass("active");

        $("input[name=display-options][value='orders']").prop("checked", true);
        $('#display-options-orders').addClass("active");

        $('#permanent-marker-tooltips').prop("checked", true);
    }
});

/**
 * Register onChange events for interactive UI
 **/


$("#order-tab").click(function () {
    displayModeControl.update("orders");
});

$("#tour-tab").click(function () {
    displayModeControl.update("tours");
});

$("#scenario-selection").change(function () {
    onScenarioChange();
});

$(".tour-options").change(function () {
    sendRequest();
});

$(".display-options-label").change(function () {
    drawIndicators();
});

$("#permanent-marker-tooltips").change(function () {
    drawMarkers();
});