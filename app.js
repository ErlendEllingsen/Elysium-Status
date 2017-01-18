var fs = require('fs');
var express = require('express')
var app = express()
var bodyParser = require('body-parser');
var http = require('http');
var colors = require('colors');
var router = express.Router(); 

var path = require('path');
var morgan = require('morgan');
var FileStreamRotator = require('file-stream-rotator');

//--- APPLICATION SETUP ---
var http_port = 80;
var https_port = 443;
var devmode = false;

if (process.argv[2] == 'dev') {
    http_port = 8080;
    https_port = 8081;
    devmode = true;
}

//--- LOAD CONFIG ---
var app_config = JSON.parse(fs.readFileSync('app_config.json'));

//--- EXPRESS CORE SETUP ---
//Hide software from potential attackers.
app.disable('x-powered-by');

//Restore ip from CF 
app.use(function(req, res, next){

    req.headers['client-realip'] = req.ip;

    if (req.headers['cf-connecting-ip'] != undefined) {
        req.headers['client-realip'] = req.headers['cf-connecting-ip'];
    }

    next();
});

//Use bodyParser
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

//-- LOGGER --
var logDirectory = path.join(__dirname, 'log');

// ensure log directory exists
fs.existsSync(logDirectory) || fs.mkdirSync(logDirectory);

// create a rotating write stream
var accessLogStream = FileStreamRotator.getStream({
  date_format: 'YYYYMMDD',
  filename: path.join(logDirectory, 'access-%DATE%.log'),
  frequency: 'daily',
  verbose: false
});

// setup the logger
app.use(morgan(':req[client-realip] - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent"', {stream: accessLogStream}));

//Keeper
var Keeper = require('./modules/keeper');
var keeper = new Keeper(devmode);


//Outcache 
var Outcache = require('./modules/outcache');
var outcache = new Outcache(keeper);

keeper.setOutcache(outcache);

//Start everything
outcache.init();
keeper.init();

//AutoQueue setup 
var autoqueue_password = fs.readFileSync('./password_autoqueue.txt').toString();




// START THE SERVER
// =============================================================================
http.createServer(app).listen(http_port);

console.log(colors.yellow('CORE') + ' Enabled ' + colors.bold('HTTP') + ' at ' + http_port);

/**
 * BEGIN
 */

app.use('/static', express.static('static'))
app.use('/', router);


router.get('/', function(req, res){
    res.sendFile('index.html', {root: __dirname })
});

router.get('/terms', function(req, res){
    res.sendFile('terms.html', {root: __dirname })
});

router.get('/privacy-policy', function(req, res){
    res.sendFile('privacypolicy.html', {root: __dirname })
});

router.get('/fetch', function(req, res){
    res.json(outcache.get('fetch'));
});

router.get('/fetch-queue', function(req, res){
    res.json(outcache.get('fetch-queue'));
});

router.get('/resources/header', function(req, res){

    var header_img = Math.floor(Math.random() * app_config.site_header_images.length) + 0;  
    res.redirect(301, app_config.site_header_images[header_img]);
    return;
});

router.post('/auto-queue-update', function(req, res){

    //Check password
  
    if (req.body['password'].trim() != autoqueue_password.trim()) {
        res.sendStatus(403);
        return;
    }

    if (req.body.autoqueue == undefined) return;
    keeper.autoqueue = JSON.parse(req.body.autoqueue);
    
    //Note down when the queue was recieved at... (If data is too old, do not use).
    keeper.autoqueue.recieved_at = new Date();
    keeper.autoqueue_set = true;
 
    //Dev: send autoqueue in return...
    res.send("ok");
    console.log("auto-queue-update triggered at " + new Date().toString());

    //Update cache!
    outcache.render('fetch-queue');
    outcache.render('fetch-stats');

});

router.get('/stats', function(req, res){
    res.json(outcache.get('stats'));
});