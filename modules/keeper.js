const execFile = require('child_process').execFile;
const colors = require('colors');
const request = require('request');

module.exports = function() {
    var self = this;

    /**
     * --- INTERNAL ---
     */

    this.statuses = {

        "logon": {
            "status": false,
            "last_updated": null,
            "timer": 60,
            "interval": false
        },
        "website": {
            "status": false,
            "last_updated": null,
            "timer": 60,
            "interval": false
        },
        "elysium_pvp": {
            "status": false,
            "last_updated": null,
            "interval": false
        },
        "nostalrius_pvp": {
            "status": false,
            "last_updated": null,
            "interval": false
        },
        "nostalrius_pve": {
            "status": false,
            "last_updated": null,
            "interval": false
        }


    };

    this.processes = {
    };

    this.processes['logon'] = function() {

        //LOGON 
        const child = execFile('ping', ['-t 10', 'logon.elysium-project.org'], (error, stdout, stderr) => {
            
            if (error != null) {
                self.statuses.logon.status = false;
                self.statuses.logon.last_updated = new Date();
                console.log(new Date().toString() + ' - Logon ' + colors.red('DOWN'));
                return;
            }
            
            self.statuses.logon.status = true;
            self.statuses.logon.last_updated = new Date();
            console.log(new Date().toString() + ' - Logon ' + colors.green('UP'));

        });


        //end Keeper.processes['logon']
    }

    this.processes['website'] = function() {

        request.get('https://elysium-project.org/status', {

            timeout: (10 * 1000)

        }, function(err, response, body){
            
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
    
    this.processes['servers'] = function(body) {


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

    this.process = function() {

        self.statuses['logon'].interval = setInterval(self.processes['logon'], (self.statuses['logon'].timer * 1000));
        self.statuses['website'].interval = setInterval(self.processes['website'], (self.statuses['website'].timer * 1000));

        self.processes['logon']();
        self.processes['website']();

        //end process 
    }

    /**
     * --- PUBLIC ---
     */

    this.get = function() {

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