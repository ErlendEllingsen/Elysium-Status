var page = {};

page.currentPage = 'overview'; //overview, realmdetails

page.setPage = function(newPage) {

    $.get('./static/html/' + newPage + '.html', function(data){

        data = page.translatePage(newPage, data);

        $('#pageContent').html(data);

        $('button[data-nav-alternative="' + page.currentPage + '"]').attr('class', 'btn btn-default navBtn');
        page.currentPage = newPage;
        $('button[data-nav-alternative="' + page.currentPage + '"]').attr('class', 'btn btn-primary navBtn');
        

        page.loaded(newPage);
    });

    //end page.setPage
}

page.translatePage = function(page, data) {

    if (page == "overview") {
        
        data = lang.processText(data, [
            'service',
            'status',
            'last_updated'
        ]);

        return data;

    }

    //end page.translatePage
}

page.loaded = function(page) {

    if (page == 'overview') {
        es.render();
    }

}