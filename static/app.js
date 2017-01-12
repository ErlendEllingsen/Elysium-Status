var ElysiumStatus = {
    serverTime: null,
    timeout: null,
    data: null,
    queueData: null,
    queueTimeout: null,

    /// Notifications ///
    isFirstFetch: true,
    lastServerStatuses: [],
    notificationsAllowed: false    
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
    es.data = data;
    es.serverTime = data.time;

    //COMPARE data
    var changedStatuses = [];
    for(var name in data.statuses) {
        if(data.statuses[name].status !== es.lastServerStatuses[name]) {
            changedStatuses.push({
                name: name,
                status: data.statuses[name].status
            });
        }

        es.lastServerStatuses[name] = data.statuses[name].status;
    }

    es.render(data);

    if(!es.isFirstFetch) {
        es.notify(changedStatuses);
    } else {
        es.isFirstFetch = false;
    }
    //end es.newData
}

es.newQueueData = function(data) {
    es.queueData = data.autoqueue;
    es.render();
}



es.notify = function(changedStatuses) {
    if(es.notificationsAllowed && changedStatuses.length) {
        var notificationString = "";
            changedStatuses.forEach(function(server) {
            notificationString += notificationLine(server.name, server.status);
        });

        playSound('notification-sound');
        new Notification('Elysium Status', {
            body: notificationString,
            tag: 'elysium-status',
            vibrate: [100, 100, 100],
            renotify: true
        });
    }
}

es.checkNotifications = function() {
    if(!('Notification' in window)) {
        console.info('This browser doesn\'t support desktop notifications');
    } else if(Notification.permission === 'granted') {
        es.notificationsAllowed = true;
    } else if(Notification.permission !== 'denied') {
        Notification.requestPermission(function(permission) {
            if(permission === 'granted') {
                es.notificationsAllowed = true;
            }
        });
    }
}

function displayName(name) {
    switch(name) {
        case 'logon':
            return 'Logon Server';
        case 'website':
            return 'Website';
        case 'elysium_pvp':
            return 'Elysium PvP';
        case 'nostalrius_pvp':
            return 'Nostalrius PvP';
        case 'nostalrius_pve':
            return 'Nostalrius PvE';
    }

    return name;
}

function notificationLine(name, status) {
    var statusString;
    switch(status) {
        case 'unstable':
            statusString = ' became unstable.';
            break;
        case true:
            statusString = ' went online.';
            break;
        default:
            statusString = ' went offline.';
            break;
     }
     return displayName(name) + statusString + '\n';
}
  
function playSound(soundObj) {
    document.getElementById(soundObj).play();
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
    
    var endDate   = new Date(es.serverTime);
    var seconds = Math.floor((endDate.getTime() - startDate.getTime()) / 1000);

    var dateZero = new Date(null);
    if (dateZero.getTime() == startDate.getTime()) return 'Never';

    return seconds + ' seconds ago';

}



$(document).ready(function(){
    es.checkNotifications();
    es.fetchData();
    es.fetchQueueData();
});