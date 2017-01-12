var ElysiumStatus = {
    data: null,
    timeout: null,
    queueData: null,
    queueTimeout: null
};
var es = ElysiumStatus;

es.fetchData = function() {

    $('#loadingImage').fadeIn();
    $.get('./fetch', function(data){
        es.newData(data);
        $('#loadingImage').fadeOut();
        es.timeout = setTimeout(es.fetchData, 15 * 1000);
    });

    //end es.fetchData
}

es.fetchQueueData = function() {
    $.get('/stats', function(data){
        es.newQueueData(data);
        es.queueTimeout = setTimeout(es.fetchQueueData, 60 * 1000);
    });
}

es.newData = function(data) {

    if (es.data == null) {
        es.data = data;
        es.render();
        return;
    }

    es.checkData(data);

    //end es.newData
}

es.newQueueData = function(data) {
    es.queueData = data.autoqueue;
    es.render();
}

es.checkData = function(data) {

    //COMPARE DATA 

    //set data 
    es.data = data;

    es.render();


    //end es.checkData
}

es.render = function() {
    if (es.data == null || es.data.statuses == undefined) return;

    for (var name in es.data.statuses) {
        var server = es.data.statuses[name];

        //Server status data 
        $("tr[data-srv='" + name + "']").find('div.srvStatus').html(getStatusText(es.data.statuses[name].status));    
        $("tr[data-srv='" + name + "']").find('h3.srvLastUpdated').html(getLastUpdated(es.data.statuses[name].last_updated));   

        //Queue data? 
        
        if (es.queueData != null && es.queueData != {} && es.queueData.servers != undefined) {

            var aqdataValid = ((Math.abs(new Date() - new Date(es.queueData.recieved_at)) / 1000) <= (3 * 60)); //Data must be max three minutes old.

            if (!aqdataValid) {
                $("tr[data-srv='" + name + "']").find('.queueText').html('Queues unavailable');
                continue; 
            }

            //Find AutoQueue for server 
            var foundSrv = null; 
            for (var i = 0; i < es.queueData.servers.length; i++) {
                var aqserver = es.queueData.servers[i]; //autoqueue-server
                if (aqserver.name == server.name) { foundSrv = aqserver; break; }
            }

            if (foundSrv == null) continue; //Did not found server.

            //Check timing of data...
            var timingOK = ((Math.abs(new Date(es.queueData.export_time) - new Date(foundSrv.last_updated)) / 1000) < (5*60));
            if (!timingOK) foundSrv.queueAvailable = false;

            var queueText = (foundSrv.queueAvailable ? "Queue: " + foundSrv.queue : 'Queue unavailable');
            $("tr[data-srv='" + name + "']").find('.queueText').html(queueText);

            //end queueData is set
        }

        //end 
    }

    //end es.render
}

//Other 
function getStatusText(status) {

    if (status == 'unknown') return '' + 
        '<h3 class="srvUnknown">' + 
        '   <i class="fa fa-question-circle-o"></i>' + 
        '    Unknown' + 
        '</h3>';

    if (status == 'unstable') return '' + 
        '<h3 class="srvUnstable">' + 
        '   <i class="fa fa-exclamation-circle"></i>' + 
        '    May be unstable' + 
        '</h3>';

    if (status) return '' + 
        '<h3 class="srvOnline">' + 
        '   <i class="fa fa-check-circle"></i>' + 
        '    Online' + 
        '</h3>';

    //Not true
    return '' + 
        '<h3 class="srvOffline">' + 
        '   <i class="fa fa-times-circle"></i>' + 
        '    Offline' + 
        '</h3>';

}

function getLastUpdated(lastUpdated) {

    var startDate = new Date(lastUpdated);



    // Do your operations
    
    var endDate   = new Date(es.data.time);
    var seconds = Math.floor((endDate.getTime() - startDate.getTime()) / 1000);

    return seconds + ' seconds ago';

}

$(document).ready(function(){
    es.fetchData();
    es.fetchQueueData();
});