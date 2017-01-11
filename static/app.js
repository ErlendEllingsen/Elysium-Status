var ElysiumStatus = {
    serverTime: null,
    timeout: null,

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

es.newData = function(data) {
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
    //end es.checkData
}

es.render = function(data) {
    for (var name in data.statuses) {
        $("tr[data-srv='" + name + "']").find('div.srvStatus').html(getStatusText(data.statuses[name].status));    
        $("tr[data-srv='" + name + "']").find('h3.srvLastUpdated').html(getLastUpdated(data.statuses[name].last_updated));    
        //end 
    }

    //end es.render
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

    return seconds + ' seconds ago';

}

function playSound(soundObj) {
    document.getElementById(soundObj).play();
}

$(document).ready(function(){
    es.checkNotifications();
    es.fetchData();
});