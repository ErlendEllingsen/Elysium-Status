const execFile = require('child_process').execFile;
const colors = require('colors');
const request = require('request');
const portscanner = require('portscanner');

module.exports = function (devmode) {
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
            "is_realm": false,
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
            "is_realm": false,
            "name": "Website",
            "status": false,
            "last_updated": null,
            "timer": 60,
            "interval": false,
            "memory": []
        },
        "elysium_pvp": {
            "is_realm": true,
            "name": "Elysium PVP",
            "website_identifier": "Elysium",
            "app_identifier": "elysium_pvp",
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
            "is_realm": true,
            "name": "Zeth'Kur PVP",
            "website_identifier": "Zeth&#039;Kur",
            "app_identifier": "zethkur_pvp",
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
            "is_realm": true,
            "name": "Anathema PVP",
            "website_identifier": "Anathema",
            "app_identifier": "anathema_pvp",
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
            "is_realm": true,
            "name": "Darrowshire PVE",
            "website_identifier": "Darrowshire",
            "app_identifier": "darrowshire_pve",
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

    // --- REALM DATA --- 
    this.realmdata = {
        available: false,
        servers: {}
    };

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

            self.parseRealmStatusPage(body);

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

    this.init = function () {
        
        //Setup vars etc 
        for (var serverIdentifier in self.statuses) {
            var server = self.statuses[serverIdentifier];
            if (!server.is_realm) continue; //Only setup realms

            //Setup realmdata
            self.realmdata.servers[serverIdentifier] = {
                population: 0,
                uptime: null,
                server_time: null,
                percentage_alliance: null,
                percentage_horde: null
            };

            //end realm setup loop 
        }

        //Start processing

        self.statuses['logon'].interval = setInterval(self.processes['logon'], (devmode ? 5000 : self.statuses['logon'].timer * 1000));
        self.statuses['website'].interval = setInterval(self.processes['website'], (devmode ? 5000 : self.statuses['website'].timer * 1000));

        self.processes['logon']();
        self.processes['website']();

        

        //end init 
    }

    this.parseRealmStatusPage = function(body) {

        try {

            var realms = body.split('<div class="realm">');
            realms.splice(0,1);

            

            for (var i = 0; i < realms.length; i++) {
                var realmHTML = realms[i];

                //Fetch properties
                var realmName = realmHTML.split('<div class="realm-name">')[1].split('</div>')[0].trim();
                var realmPop = realmHTML.split('<div class="realm-line">Population: ')[1].split('</div>')[0].trim();
                
                var realmPercentAlliance = realmHTML.split('<div class="progress-bar progress-bar-info" role="progressbar" style="width:')[1].split('%">')[0].trim();
                var realmPercentHorde = realmHTML.split('<div class="progress-bar progress-bar-danger" role="progressbar" style="width:')[1].split('%">')[0].trim();

                var realmServerTime = realmHTML.split('<div class="realm-line">Server Time: ')[1].split('</div>')[0].trim();
                var realmUptime = realmHTML.split('<div class="realm-line">Uptime: ')[1].split('</div>')[0].trim();

                //Find correct server
                var foundRealm = null; 
                
                for (var serverStoredName in self.statuses) {
                    var compareRealm = self.statuses[serverStoredName];
                    if (!compareRealm.is_realm) continue; //Only compare with realms
                    
                    
                    if (compareRealm.website_identifier.toLowerCase() == realmName.toLowerCase()) {
                        foundRealm = compareRealm;
                        break;
                    }
                }

                //Ensure that we found a realm...
                if (foundRealm === null) continue; //No realm to attach data to..
                

                //Assemble realm object 
                var realmObj = {
                    population: realmPop,
                    uptime: realmUptime,
                    server_time: realmServerTime,
                    percentage_alliance: realmPercentAlliance,
                    percentage_horde: realmPercentHorde
                };

                //Assign to realmdata...
                self.realmdata.servers[foundRealm.app_identifier] = realmObj;

            }
            
            
            //Parsing was success..
            self.realmdata.available = true; 

        } catch (e) {
            //Unable to parse data... 
            console.log('Unable to parse web realm data ' + e);
            self.realmdata.available = false; 
            return;
        }

        //end Keeper.parseRealmStatusPage
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
                't': srv['last_updated'], //t = last_updated (time)
            };

            //Try to fetch population
            var pop = false; 
            if (self.realmdata.available && self.realmdata.servers[server] != undefined) {
                var srvRealmData = self.realmdata.servers[server];
                pop = srvRealmData.population;
            }
            if (srv.is_realm) outStatuses[server].p = pop; //p = pop (population)

        }

        return {
            time: new Date(),
            statuses: outStatuses
        };

        //end Keeper.get 
    }


    //end Keeper
}