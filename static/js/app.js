var ElysiumStatus = {
    timeout: null,
    data: null,
    queueData: null,
    queueTimeout: null,

    /// Language ///
    language: {
        localization: null,
        browser_lang: 'en'
    },

    /// Notifications ///
    isFirstFetch: true,
    lastServerStatuses: [],
    notificationsAllowed: false    
};

var es = ElysiumStatus;
var lang = es.language.localization;

es.fetchData = function() {

    $('#loadingImage').fadeIn();
    $.get({
        url: './fetch',

        success: function(data) {
            es.newData(data);
            es.timeout = setTimeout(es.fetchData, 15 * 1000);

            $("#data-unavailable").remove();
        },
        error: function() {
            es.timeout = setTimeout(es.fetchData, 10 * 1000);

            if(!$("#data-unavailable").length) {
                $("#pageContent").append(
                    '<div id="data-unavailable"><span>Data currently unavailable.</span><br/><span>Retrying...<span></div>'
                );
            }
        },
        complete: function() {
            $('#loadingImage').fadeOut();
        }
    });

    //end es.fetchData
}

es.fetchQueueData = function() {
    $.get('/fetch-queue', function(data){
        es.newQueueData(data);
        es.queueTimeout = setTimeout(es.fetchQueueData, 60 * 1000);
    });
}

es.newData = function(data) {
    es.data = data;
    
    //Convert from minified to full 
    for (var serviceName in es.data.statuses) {
        
        var service = es.data.statuses[serviceName];
        
        //Set new 
        service.name = service.n; 
        service.status = service.s;
        service.last_updated = service.t;
    }
    
    //COMPARE data
    var changedStatuses = [];
    for(var name in data.statuses) {
        if(data.statuses[name].status !== es.lastServerStatuses[name]) {
            changedStatuses.push({
                name: data.statuses[name].name,
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
     return name + statusString + '\n';
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
            var foundSrv = (es.queueData.servers[name] != undefined ? es.queueData.servers[name] : null);

            if (foundSrv == null) continue; //Did not found server.

            //Check timing of data...
            var timingOK = ((Math.abs(new Date(es.queueData.export_time) - new Date(foundSrv.last_updated)) / 1000) < (15*60)); //10 minute data freshness requirement
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
        '    ' + upperFirst(lang.processKey('status_unknown'))+
        '</h3>';

    if (status == 'unstable') return '' + 
        '<h3 class="srvUnstable">' + 
        '   <i class="fa fa-exclamation-circle"></i>' + 
        '    ' + upperFirst(lang.processKey('status_unstable'))+ 
        '</h3>';

    if (status) return '' + 
        '<h3 class="srvOnline">' + 
        '   <i class="fa fa-check-circle"></i>' + 
        '    ' + upperFirst(lang.processKey('status_online'))+
        '</h3>';

    //Not true
    return '' + 
        '<h3 class="srvOffline">' + 
        '   <i class="fa fa-times-circle"></i>' + 
        '    ' + upperFirst(lang.processKey('status_offline'))+
        '</h3>';

}

function getLastUpdated(lastUpdated) {

    var startDate = new Date(lastUpdated);



    // Do your operations
    
    var endDate   = new Date(es.data.time);
    var seconds = Math.floor((endDate.getTime() - startDate.getTime()) / 1000);

    var dateZero = new Date(null);
    if (dateZero.getTime() == startDate.getTime()) return upperFirst(lang.processKey('never'));

    return seconds + ' ' + lang.processKey('seconds_ago');

}



$(document).ready(function(){

    

    

    //Language 
    lang = new Localization();
    
    es.language.browser_lang = (navigator.languages ? navigator.languages[0] : (navigator.language || navigator.userLanguage));

    es.language.browser_lang = lang.tools.convertLanguage(es.language.browser_lang)

    console.log('user lang is ' + es.language.browser_lang);

    
    lang.initialize('./static/locale/', function(){

        //Set locale to browser or fallback..
        lang.setLocale(lang.supportsLocale(es.language.browser_lang) ? es.language.browser_lang : 'en');

        //Language loaded 
        lang.loadModule('app.json', function(){
            
            //LOADED!

            //Data 
            es.checkNotifications();
            es.fetchData();
            es.fetchQueueData();

            //Set page 
            $('body').css('display', 'block');
            page.setPage('overview'); 
            es.postLoadTranslate();

        });

    });

    //Binds
    $('#btn_overview').on('click', {}, function(){ page.setPage('overview'); });
    $('#btn_realmdetails').on('click', {}, function(){ page.setPage('realmdetails'); });

});

es.postLoadTranslate = function() {

    //Nav btn 
    $('span[data-lang-key="nav_overview"]').html(upperFirst(lang.processKey('nav_overview')));
    $('span[data-lang-key="nav_realm_details"]').html(upperFirst(lang.processKey('nav_realm_details')));

    //Donate
    $('span[data-lang-key="donate_text"]').html(upperFirst(lang.processKey('donate_text')));
    $('a[data-lang-key="donate_text_action"]').html(lang.processKey('donate_text_action'));

    //end es.postLoadTranslate();
}