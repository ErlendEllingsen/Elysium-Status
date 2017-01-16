/**
 * Outcache caches the data that's going to be sent out. Uses cached data instead of rendering and computing on each request.
 */
module.exports = function(keeper) {
    var self = this;

    //--- VARS ---
    this.caches = {
        'fetch': {
            'timeout': null,
            'response': {},
            'render': function(){ },
            'time': 1000
        },
        'fetch-queue': {
            'timeout': null,
            'response': {},
            'render': function(){},
            'time': 1000
        },
        'stats': {
            'timeout': null,
            'response': {},
            'render': function(){},
            'time': 5000
        }
    };

    //--- CACHE METHODS ---
    
    this.caches['fetch'].render = function() {
        var cache = self.caches['fetch'];

        cache.response = keeper.get();

        //end render:fetch 
    }

    this.caches['fetch-queue'].render = function() {
        var cache = self.caches['fetch-queue'];

        cache.response = {autoqueue: keeper.autoqueue};

        //end render:fetch-queue 
    }

    this.caches['stats'].render = function() {
        var cache = self.caches['stats'];

        //compute and render  
        var outcontent = {
            time: new Date(),
            servers: {},
            autoqueue: keeper.autoqueue,
            realmdata: keeper.realmdata
        };

        for (var serverName in keeper.statuses) {
            
            var outServer = {};
            var storedServer = keeper.statuses[serverName];

            outServer.status = storedServer.status;
            outServer.last_updated = storedServer.last_updated;

            //Include memory for some servers..
            if (storedServer.memory != undefined) outServer.memory = storedServer.memory;
            

            outcontent.servers[serverName] = outServer;

        }

        //set data
        cache.response = outcontent;

        //end render:stats 
    }

    //--- OTHER METHODS ---

    this.init = function() {
    
        for (var cacheName in self.caches) {
            self.render(cacheName);
        }

        //end Outcache.init 
    }

    this.get = function(cacheName) {
        if (self.caches[cacheName] == undefined) return;
        if (self.caches[cacheName].response == {}) self.caches[cacheName].render();
        return self.caches[cacheName].response;
    }

    this.render = function(cacheName) {
        if (self.caches[cacheName] == undefined) return;

        var cache = self.caches[cacheName];

        //Empty timeout (to prevent eventual overflow )
        if (cache.timeout != null) clearTimeout(cache.timeout);
        
        cache.render();

        //Set new timeout 
        cache.timeout = setTimeout(function(){ self.render(cacheName); }, cache.time);

        //end Outcache.render
    }

    

    //end Outcache
}