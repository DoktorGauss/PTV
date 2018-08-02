'use strict';


class PTV_Setup {

    map : L

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

    




}