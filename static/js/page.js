var page = {};

page.currentPage = 'overview'; //overview, realmdetails

page.setPage = function(newPage) {

    $.get('./static/html/' + newPage + '.html', function(data){
        $('#pageContent').html(data);

        $('button[data-nav-alternative="' + page.currentPage + '"]').attr('class', 'btn btn-default navBtn');
        page.currentPage = newPage;
        $('button[data-nav-alternative="' + page.currentPage + '"]').attr('class', 'btn btn-primary navBtn');
        

        page.loaded(newPage);
    });

    //end page.setPage
}

page.loaded = function(page) {

    if (page == 'overview') {
        es.render();
    }

}