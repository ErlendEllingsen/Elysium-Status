const execFile = require('child_process').execFile;
const colors = require('colors');
const request = require('request');
const portscanner = require('portscanner');

module.exports = function () {
    var self = this;

    // --- SETUP --- 
    this.outcache = null;
    this.setOutcache = function(outcache) {
        self.outcache = outcache;
    }

    /**
     * --- INTERNAL ---
     */

    this.statuses = {

        "logon": {
            "name": "Login Server",
            "status": false,
            "last_updated": null,
            "timer": 60,
            "interval": false,
            "memory": [],
             "endpoint": {
                "ip": "164.132.233.125", //"logon.elysium-project.org"
                "port": 3724
            }
        },
        "website": {
            "name": "Website",
            "status": false,
            "last_updated": null,
            "timer": 60,
            "interval": false,
            "memory": []
        },
        "elysium_pvp": {
            "name": "Elysium PVP",
            "status": false,
            "last_updated": null,
            "interval": false,
            "memory": [],
            "endpoint": {
                "ip": "149.202.207.235",
                "port": 8099
            }
        },
        "zethkur_pvp": {
            "name": "Zeth'Kur PVP",
            "status": false,
            "last_updated": null,
            "interval": false,
            "memory": [],
            "endpoint": {
                "ip": "151.80.103.221",
                "port": "8093"
            }
        },
        "anathema_pvp": {
            "name": "Anathema PVP",
            "status": false,
            "last_updated": null,
            "interval": false,
            "memory": [],
            "endpoint": {
                "ip": "149.202.211.5",
                "port": 8095
            }
        },
        "darrowshire_pve": {
            "name": "Darrowshire PVE",
            "status": false,
            "last_updated": null,
            "interval": false,
            "memory": [],
            "endpoint": {
                "ip": "164.132.233.125",
                "port": 8097
            }
        }


    };
    
    // --- AUTOQUEUE ---

    this.autoqueue = {};
    this.autoqueue_set = false;
    this.autoqueueIsValid = function() {
        
        if (!self.autoqueue_set) return false; 

        //Compare time 
        var diff = (Math.abs(new Date() - self.autoqueue.recieved_at) / 1000); //diff in secs 
        
        if (diff > 60) return false; 


        return true; 
    }

    // --- MEMORY ---

    this.memory = {};

    this.memory.addMemory = function (name, status) {
        var stat = self.statuses[name];

        stat.memory.push(status);
        if (stat.memory.length > 10) stat.memory.splice(0, 1);

        //end Keeper.memory.addMemory
    }

    this.memory.isMemoryBad = function (name) {

        var stat = self.statuses[name];
        var foundFalse = false;

        var x = 0;

        for (var i = 0; i < stat.memory.length; i++) {
            var memPiece = stat.memory[i];
            if (memPiece === false) {
                x++;
                if (x >= 2) foundFalse = true; //Only mark memory as bad when 2/10 memPiece are bad(false).
            }
        }

        if (foundFalse) return true;
        return false;

        //end
    }

    // --- STATUS PROCESSING (CORE) ---

    this.processes = {};



    this.processes['logon'] = function () {


       self.processes['scan-server']('logon');
       self.processes['servers']();

       //Update cache!
       self.outcache.render('fetch'); 

        //end Keeper.processes['logon']
    }

    this.processes['website'] = function () {

        request.get('https://elysium-project.org/status', {

            timeout: (15 * 1000)

        }, function (err, response, body) {

            if (err != null || response.statusCode != 200) {
                self.statuses.website.status = false;
                self.statuses.website.last_updated = new Date();
                console.log(new Date().toString() + ' - Website ' + colors.red('DOWN'));
                return;
            }

            self.statuses.website.status = true;
            self.statuses.website.last_updated = new Date();
            console.log(new Date().toString() + ' - Website ' + colors.green('UP'));

            

        });

        //Update cache!
        self.outcache.render('fetch');

        //end Keeper.processes['website']
    }

    this.processes['scan-server'] = function(serverName) {

        var server = self.statuses[serverName];

        //Scan server (scan 1) 
        portscanner.checkPortStatus(server.endpoint.port, server.endpoint.ip, function (errorX, statusX) {

            //Scan server, scan 2
            setTimeout(function(){

                portscanner.checkPortStatus(server.endpoint.port, server.endpoint.ip, function (errorY, statusY) {

                    //Check both results. If either of the scans were ok, then success...
                    if (statusX === 'open' || statusY === 'open') {
                        self.memory.addMemory(serverName, true);
                        self.statuses[serverName].status = (self.memory.isMemoryBad(serverName) ? 'unstable' : true);
                        self.statuses[serverName].last_updated = new Date();
                        console.log(new Date().toString() + ' - ' + serverName + ' ' + colors.green('UP'));

                        //SPECIAL TREATMENT - LOGON... 
                        //if auto-queue is valid and indicates that logon is unstable, then update status.
                        if ((serverName == "logon") && (self.autoqueueIsValid()) && (self.autoqueue.loginServerUnreliable)) {
                            self.statuses[serverName].status = 'unstable'; 
                            console.log(new Date().toString() + ' - ' + serverName + ' ' + colors.cyan('UNSTABLE (AQ)'));
                        }

                        return;
                    }

                    //status was not open..
                    self.memory.addMemory(serverName, false);
                    self.statuses[serverName].status = false;
                    self.statuses[serverName].last_updated = new Date();
                    console.log(new Date().toString() + ' - ' + serverName + ' ' + colors.red('DOWN'));
                    return;

                    //end portscan 2/2
                });

                //end timeout between portscans
            }, 1000); //1000 milisec delay..  

    
            //end portscan 1/2
        });



        //end Keeper.processes['scan-server']
    }

    this.processes['servers'] = function () {

        self.processes['scan-server']('elysium_pvp');
        self.processes['scan-server']('anathema_pvp');
        self.processes['scan-server']('darrowshire_pve');
        self.processes['scan-server']('zethkur_pvp');

        //end Keeper.processes['servers']
    }

    this.process = function () {
        
        //The realms are invoked by login-process 

        self.statuses['logon'].interval = setInterval(self.processes['logon'], (self.statuses['logon'].timer * 1000));
        self.statuses['website'].interval = setInterval(self.processes['website'], (self.statuses['website'].timer * 1000));

        self.processes['logon']();
        self.processes['website']();

        //end process 
    }

    /**
     * --- PUBLIC ---
     */

    this.get = function () {

        var outStatuses = {};

        for (var server in self.statuses) {
            var srv = self.statuses[server];

            outStatuses[server] = {
                'n': srv.name, //n = name
                's': srv.status, //s = status 
                't': srv['last_updated'] //t = last_updated (time)
            };

        }

        return {
            time: new Date(),
            statuses: outStatuses
        };

        //end Keeper.get 
    }


    //end Keeper
}