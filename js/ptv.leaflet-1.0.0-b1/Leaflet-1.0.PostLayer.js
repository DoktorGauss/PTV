/*
* L.PostLayer is used for request map imagery with post requests, both tiled and non-tiled.
*/
L.PostLayer = {};

L.PostLayer.NonTiled = L.NonTiledLayer.extend({
    options: {
        authHeader: ''
    },
	
    url: '',

    initialize: function (url, requestFunc, responseFunc, options) {
        this.url = url;
		this.getRequest = requestFunc,
		this.processResponse = responseFunc,
        L.Util.setOptions(this, options);
    },
	
    getImageUrlAsync: function (world1, world2, width, height, callback) {
        var request = this.getRequest(world1, world2, width, height);
		var self = this;

        this.runRequest(this.url, request, this.options.authHeader,
            function (resp) {
                callback(self.processResponse(resp), resp);
            }, function (xhr) { callback(L.Util.emptyImageUrl); });
    },

    // runRequest executes a json request on PTV xServer internet, 
    // given the url endpoint, the authHeader and the callbacks to be called
    // upon completion. The error callback is parameterless, the success
    // callback is called with the object returned by the server. 
    runRequest: function (url, request, authHeader, handleSuccess, handleError) {
        $.ajax({
            url: url,
            type: "POST",
            data: JSON.stringify(request),

            headers: {
                "Authorization": authHeader,
                "Content-Type": "application/json"
            },

            success: function (data, status, xhr) {
                handleSuccess(data);
            },

            error: function (xhr, status, error) {
                handleError(xhr);
            }
        });
    }
});

L.PostTileLayer = L.TileLayer.extend({
    maxConcurrentRequests: 6,

    activeRequestCount: 0,

    requestQueue: [],

    currentRequests: [],
	
	 onAdd: function (map) {
        this._map = map;

        this.requestQueue = [];
		this.cnt = this.cnt + 1;
        this.activeRequestCount = 0;
        for (var i = 0; i < this.currentRequests.length; i++)
            this.currentRequests[i].abort();
        this.currentRequests = [];

        L.TileLayer.prototype.onAdd.call(this, map);
    },

    onRemove: function (map) {
        this.requestQueue = [];
		this.cnt = this.cnt + 1;
        this.activeRequestCount = 0;
        for (var i = 0; i < this.currentRequests.length; i++)
            this.currentRequests[i].abort();
        this.currentRequests = [];

        L.TileLayer.prototype.onRemove.call(this, map);
    },

    __createTile: function (tile, tilePoint) {
        tile._layer = this;
        tile.onload = this._tileOnLoad;
        tile.onerror = this._tileOnError;

        this._requestTile(tile, tilePoint);
    },

    createTile: function (coords, done) {
        var tile = document.createElement('img');

        tile._layer = this;
        tile.onload = L.bind(this._tileOnLoad, this, done, tile);
        tile.onerror = L.bind(this._tileOnError, this, done, tile);

        if (this.options.crossOrigin) {
            tile.crossOrigin = '';
        }

        /*
		 Alt tag is set to empty string to keep screen readers from reading URL and for compliance reasons
		 http://www.w3.org/TR/WCAG20-TECHS/H67
		*/
        tile.alt = '';

        this._requestTile(tile, coords);

        return tile;
    },

    _reset: function () {
        this.requestQueue = [];
		this.cnt = this.cnt + 1;
        for (var i = 0; i < this.currentRequests.length; i++)
            this.currentRequests[i].abort();
        this.currentRequests = [];

        this.activeRequestCount = 0;
        L.TileLayer.prototype._reset.call(this);
    },
	
		cnt: 0,

    runRequestQ: function (url, request, authHeader, handleSuccess, handleError, force) {
        if (!force && this.activeRequestCount >= this.maxConcurrentRequests) {
            this.requestQueue.push({ url: url, request: request, authHeader: authHeader, handleSuccess: handleSuccess, handleError: handleError });
            return;
        }
        if (!force)
            this.activeRequestCount++;
			
        var that = this;
		var cnt = this.cnt;

        var request = $.ajax({
            url: url,
            type: "POST",
            data: JSON.stringify(request),

            headers: {
                "Authorization": authHeader,
                "Content-Type": "application/json"
            },

            success: function (data, status, xhr) {
                that.currentRequests.splice(that.currentRequests.indexOf(request), 1);
                if (that.cnt == cnt && that.requestQueue.length) {
                    var pendingRequest = that.requestQueue.shift();
                    that.runRequestQ(pendingRequest.url, pendingRequest.request, pendingRequest.authHeader, pendingRequest.handleSuccess, pendingRequest.handleError, true);
                }
                else {
                    that.activeRequestCount--;
                }
                handleSuccess(data);
            },

            error: function (xhr, status, error) {
                that.currentRequests.splice(that.currentRequests.indexOf(request), 1);
                if (that.cnt == cnt && that.requestQueue.length) {
                    var pendingRequest = that.requestQueue.shift();
                    that.runRequestQ(pendingRequest.url, pendingRequest.request, pendingRequest.authHeader, pendingRequest.handleSuccess, pendingRequest.handleError, true);
                }
                else {
                    that.activeRequestCount--;
                }

                handleError(xhr);
            }
        });

        this.currentRequests.push(request);
    }
});

L.PostLayer.Tiled = L.PostTileLayer.extend({
    options: {
        beforeSend: null,
        errorTileUrl: 'tile-error.png',
        noWrap: true,
        bounds: new L.LatLngBounds([[85.0, -178.965000], [-66.5, 178.965000]]),
        minZoom: 0,
        maxZoom: 19,
        authHeader: ''
    },

    url: '',

    initialize: function (url, requestFunc, responseFunc, options) {
        this.url = url;
		this.getRequest = requestFunc,
		this.processResponse = responseFunc,
        L.Util.setOptions(this, options);
    },

    _requestTile: function (tile, coords) {
        var self = this, map = this._map, tileBounds = this._tileCoordsToBounds(coords);

	    var request = this.getRequest(tileBounds.getNorthWest(), tileBounds.getSouthEast(), 256, 256);

        this.runRequestQ(
        this.url, request, this.options.authHeader,

        function (response) {
            tile.src = self.processResponse(response);
        },

        function (xhr) {
        });
    }
});

