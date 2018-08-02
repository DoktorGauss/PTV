/**
 * Show a progress bar for dima calculation.
 */
L.Control.ProgressControl = L.Control.extend({
    options: {
        'position': 'bottomleft'
    },

    // on adding the control to the specified map
    onAdd: function(map) {
        this._container = L.DomUtil.create('div', 'controlPanel');
        
        this._container.innerHTML = '<p><div id="progression-title"></div></p>\
        <div class="progress" id="progression-bar" style="width:400px">\
            <div class="progress-bar progress-bar-striped active" id="progression-dima" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100" style="width:0%">0%</div>\
        </div>\
        <p><table><tr><td><i style="display: none;" id="spinner" class="fa fa-spinner fa-spin fa-fw"></i></td><td><div id="progression-content"></div></td></tr></table></p>';

        this.hide();
        this.updateProgress(0);
        
        if (L.DomEvent) {
            L.DomEvent.disableClickPropagation(this._container);
            L.DomEvent.disableScrollPropagation(this._container);
        }
        return this._container;
    }, 
    
    updateProgress: function (value) {
        $('#progression-dima').attr("style", "width:" + value + "%")
        $('#progression-dima').text(value + "%");
    },
    update: function (jobProgress) {
        $('#progression-dima').attr("style", "width:" + jobProgress.calculationProgress + "%")
        $('#progression-dima').text(jobProgress.calculationProgress + "%");        
    },
    
    show: function (showProgress) {
        $(this._container).show();
        if (showProgress) this.showProgress();
        this.updateProgress(0);
    },
    hide: function () {
        $(this._container).hide();
    },
    
    showProgress: function () {
        $('#progression-bar').css('display', 'block');
    },
    hideProgress: function () {
        $('#progression-bar').css('display', 'none');
    },
    
    setTitle: function (message) {
        $('#progression-title').css('display', 'block');
        $('#progression-title').text(message);
    },
    setContent: function (message) {
        $('#progression-content').css('display', 'block');
        $('#progression-content').text(message);
        $('#spinner').css('display', 'block');
    },
    
    reset: function () {
        this.updateProgress(0);
        $('#progression-content').css('display', 'none');
        $('#progression-content').text('');
        $('#progression-content').empty();
        $('#spinner').css('display', 'none');
    }
});