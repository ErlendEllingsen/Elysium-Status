const execFile = require('child_process').execFile;
const colors = require('colors');
const request = require('request');
const portscanner = require('portscanner');

module.exports = function () {
    var self = this;

    /**
     * --- INTERNAL ---
     */

    this.statuses = {

        "logon": {
            "status": false,
            "last_updated": null,
            "timer": 60,
            "interval": false,
            "memory": []
        },
        "website": {
            "status": false,
            "last_updated": null,
            "timer": 60,
            "interval": false,
            "memory": []
        },
        "elysium_pvp": {
            "status": false,
            "last_updated": null,
            "interval": false,
            "memory": []
        },
        "nostalrius_pvp": {
            "status": false,
            "last_updated": null,
            "interval": false,
            "memory": []
        },
        "nostalrius_pve": {
            "status": false,
            "last_updated": null,
            "interval": false,
            "memory": []
        }


    };

    this.memory = {};

    this.memory.addMemory = function (name, status) {
        var stat = self.statuses[name];

        stat.memory.push(status);
        if (stat.memory.length > 20) stat.memory.splice(0, 1);

        //end Keeper.memory.addMemory
    }

    this.memory.isMemoryBad = function (name) {

        var stat = self.statuses[name];
        var foundFalse = false;

        for (var i = 0; i < stat.memory.length; i++) {
            var memPiece = stat.memory[i];
            if (memPiece === false) {
                foundFalse = true;
                break;
            }
        }

        if (foundFalse) return true;
        return false;

        //end
    }

    this.processes = {};



    this.processes['logon'] = function () {


        //LOGON 
        portscanner.checkPortStatus(3724, 'logon.elysium-project.org', function (error, status) {




            if (status === 'open') {
                self.memory.addMemory('logon', true);
                self.statuses.logon.status = (self.memory.isMemoryBad('logon') ? 'unstable' : true);
                self.statuses.logon.last_updated = new Date();
                console.log(new Date().toString() + ' - Logon ' + colors.green('UP'));
                return;
            }

            //status was not open..
            self.memory.addMemory('logon', false);
            self.statuses.logon.status = false;
            self.statuses.logon.last_updated = new Date();
            console.log(new Date().toString() + ' - Logon ' + colors.red('DOWN'));
            return;

        });

        //end Keeper.processes['logon']
    }

    this.processes['website'] = function () {

        request.get('https://elysium-project.org/status', {

            timeout: (10 * 1000)

        }, function (err, response, body) {

            if (err != null || response.statusCode != 200) {
                self.statuses.website.status = false;
                self.statuses.website.last_updated = new Date();
                console.log(new Date().toString() + ' - Website ' + colors.red('DOWN'));

                //MARK REALMS AS UNKNOWN
                self.statuses['elysium_pvp'].status = 'unknown';
                self.statuses['nostalrius_pvp'].status = 'unknown';
                self.statuses['nostalrius_pve'].status = 'unknown';

                self.statuses['elysium_pvp'].last_updated = new Date();
                self.statuses['nostalrius_pvp'].last_updated = new Date();
                self.statuses['nostalrius_pve'].last_updated = new Date();

                return;
            }

            self.statuses.website.status = true;
            self.statuses.website.last_updated = new Date();
            console.log(new Date().toString() + ' - Website ' + colors.green('UP'));

            self.processes['servers'](body);

        });


        //end Keeper.processes['logon']
    }

    this.processes['servers'] = function (body) {


        function getRealmStatus(realm) {
            var realmRes = (body.split('<div class="realm-name">\n' +
                realm)[1].split('<div class="progress">')[0]).toLowerCase().indexOf('online') != -1;
            return realmRes;

            //end getRealmStatus
        }

        self.statuses['elysium_pvp'].status = getRealmStatus('Elysium PvP');
        self.statuses['nostalrius_pvp'].status = getRealmStatus('Nostalrius PvP');
        self.statuses['nostalrius_pve'].status = getRealmStatus('Nostalrius PvE');

        self.statuses['elysium_pvp'].last_updated = new Date();
        self.statuses['nostalrius_pvp'].last_updated = new Date();
        self.statuses['nostalrius_pve'].last_updated = new Date();

        //end Keeper.processes['servers']
    }

    this.process = function () {

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
                'status': srv.status,
                'last_updated': srv['last_updated']
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