var ElysiumStatus = {
    data: null,
    timeout: null
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

    if (es.data == null) {
        es.data = data;
        es.render();
        return;
    }

    es.checkData(data);

    //end es.newData
}

es.checkData = function(data) {

    //COMPARE DATA 

    //set data 
    es.data = data;

    es.render();


    //end es.checkData
}

es.render = function() {


    for (var name in es.data.statuses) {
        $("tr[data-srv='" + name + "']").find('div.srvStatus').html(getStatusText(es.data.statuses[name].status));    
        $("tr[data-srv='" + name + "']").find('h3.srvLastUpdated').html(getLastUpdated(es.data.statuses[name].last_updated));    
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
});