var page = {};

page.currentPage = 'overview'; //overview, realmdetails

page.setPage = function(newPage) {

    $.get('./static/html/' + newPage + '.html', function(data){

        data = page.translatePage(newPage, data);

        $('#pageContent').html(data);

        $('a[data-nav-alternative="' + page.currentPage + '"]').parent().attr('class', '');
        page.currentPage = newPage;
        $('a[data-nav-alternative="' + page.currentPage + '"]').parent().attr('class', 'active');
        

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
    
    //fallback
    return data;

    //end page.translatePage
}

page.loaded = function(page) {

    if (page == 'overview') {
        es.render();
    }

}