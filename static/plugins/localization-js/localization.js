/**
 * Localization
 * Javascript platform for localization and globalization.
 * 
 * @author Erlend Ellingsen <erlend.ame@gmail.com
 * @version 1.2.0 14.01.2017
 */

var Localization = function() {
    var self = this;

    this.identifier_opening = '#';
    this.identifier_closing = '#';

    this.configpath = '';
    this.config = null;
    this.initialized = false;

    this.locale_name = '';
    this.locale = {};
    this.modules_loaded = {};

    this.tools = {};

    this.tools.findAndReplace = function(subject, search, replacement) {
        var target = subject;
        return target.replace(new RegExp(search, 'g'), replacement);
    };  

    this.tools.uppercase = function(string) {
        return string.charAt(0).toUpperCase() + string.substring(1);
    }

    this.tools.convertLanguage = function(lang) {

        var lang_lower = lang.toLowerCase();

        switch (lang_lower) {

            case 'no-nb': case 'no-nn': case 'nb': case 'nn': //Norwegian
                return 'no';
            case 'fr-fr': case 'fr-be': case 'fr-ch': //French
                return 'fr';
            case 'en-gb': case 'en-us': //English
                return 'en';
            case 'es-ni': case 'es-sv': case 'es-py': case 'es-cl': case 'es-ar': case 'es-co': case 'es-do': //Spanish
            case 'es-cr': case 'es-mx': //Spanish
                return 'es';
            default: 
                return lang;
            
        }

    }


    this.initialize = function(configpath, callback) {

         try {

             self.configpath = configpath;

            function reqListener () {
                var data = this.responseText;
                self.config = JSON.parse(data);
                self.initialized = true;
                callback();
            }
            

            var oReq = new XMLHttpRequest();
            oReq.addEventListener("load", reqListener);
            oReq.open("GET", './' + self.configpath + 'config.json');
            oReq.send();


        } catch (e) {
            throw "Localization loadModule error: " + e;
        }

        //end Localization.initialize
    }

    this.supportsLocale = function(locale) {
        if (!self.initialized) throw "Localization not initialized";

        for (var i = 0; i < self.config.supported_locales.length; i++) {
            if (self.config.supported_locales[i].toLowerCase() == locale.toLowerCase()) return true;
        }

        return false; 

        //end Localization.supportsLocale
    }

    this.setLocale = function(locale) {
        if (!self.initialized) throw "Localization not initialized";

        self.locale_name = locale;

        console.log('[Localization] Locale set to ' + self.locale_name);

        //end Localization.setLocale
    }

    this.loadModule = function(module, callback) {
        if (!self.initialized) throw "Localization not initialized";

        try {

            function reqListener () {
                var data = this.responseText;
                var langObj = JSON.parse(data);
                
                self.modules_loaded[langObj.title] = langObj;

                //Transfer fields to self.locale
                for (var prop in langObj.content) {
                    self.locale[prop] = langObj.content[prop];
                }

                console.log('[Localization] Loaded module ' + langObj.title);
                callback();
            }

            var oReq = new XMLHttpRequest();
            oReq.addEventListener("load", reqListener);
            oReq.open("GET", './' + self.configpath + self.locale_name + '/' + module);
            oReq.send();
            
        } catch (e) {
            throw "Localization loadModule error: " + e;
        }

        //end Localization.loadModule
    }
    
    this.processKey = function(key) {        
        if (self.locale[key] == undefined) return undefined; //Handle differently?
        return self.locale[key]; 
        //end Localization.processKey
    }
    
    //Alias for processKey
    this.fetch = function(key) {
        return self.getTranslation(key);
    }

    this.processText = function(text, vars) {

        var workingVar = text; 
        
        for (var i = 0; i < vars.length; i++) {

            var variable = vars[i];
            var searchVar = self.identifier_opening + vars[i] + self.identifier_closing;
            workingVar = self.tools.findAndReplace(workingVar, searchVar, self.locale[variable]);

        }

        return workingVar;

        //end Localization.processText
    }

    //end Localization
}