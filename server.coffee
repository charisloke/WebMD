###
# Module dependencies.
###

express = require("express")
jade = require("jade")
expressValidator = require("express-validator")
check = require("validator").check
sanitize = require("validator").sanitize
app = module.exports = express.createServer()
mongoose = require("mongoose")
mongoStore = require("connect-mongo")
models = require("./models")
stylus = require("stylus")
siteConf = require("./siteConfig.js")
fs = require("fs")
path = require("path")
db = undefined
Transcription = undefined
User = undefined
LoginToken = undefined
Bounty = undefined
sys = require("util")
exec = require("child_process").exec

# Constants
IS_LOCAL_MACHINE = siteConf.isLocal
TRANSCRIPTION_FILE_DIR = "/mongodb/transcriptions/"
serverDir = undefined
if IS_LOCAL_MACHINE
  serverDir = "/Users/Varun/Documents/workspace/jazz/jazz/"
else
  serverDir = "/var/jazz/"
# process.chdir(serverDir);

###**********************************
// Helper functions
**********************************###
puts = (error, stdout, stderr) ->
  sys.puts stdout
getIsFirefox = (req) ->
  (/firefox/i).test req.headers["user-agent"]
authenticateFromLoginToken = (req, res, next) ->
  cookie = JSON.parse(req.cookies.logintoken)
  LoginToken.findOne
    username: cookie.username
    series: cookie.series
    token: cookie.token
  , ((err, token) ->
    unless token
      next()
      return
    User.findOne
      username: token.username
    , (err, user) ->
      if user
        req.session.user_id = user.id
        req.currentUser = user
        token.token = token.randomToken()
        token.save ->
          res.cookie "logintoken", token.cookieValue,
            expires: new Date(Date.now() + 2 * 604800000)
            path: "/"

          next()
      else
        next()
  )
getReadableTime = (mill) ->

###//**********************************
//Middleware
//**********************************###
member = (req, res, next) ->
  unless req.currentUser
    res.redirect "/register"
  else
    next()
loadUser = (req, res, next) ->
  next()
checkUser = (req, res, next) ->
  next()
validateErr = (req, res, next) ->
  req.onValidationError (msg) ->
    console.log "Validation Error: " + msg
    throw new Error(msg)
  next()
app.listen 3000


# App Config
app.configure ->
  app.set "db-uri", "mongodb://nodejitsu:5e445078e063c9e14b2b1c8efacdac33@staff.mongohq.com:10076/nodejitsudb254655919034"
  app.set "views", __dirname + "/views"
  app.set "view engine", "jade"
  # set pretty to false for editable fields in transcriptionDisplay
  # Extra whitespace added when editing AARGHHH
  app.set "view options",
    pretty: false

  fileUploadDir = undefined
  if IS_LOCAL_MACHINE
    fileUploadDir = "/Users/Varun/tmp/transcriptions/"
  else
    fileUploadDir = TRANSCRIPTION_FILE_DIR + "tmp/"
  app.use express.bodyParser(uploadDir: fileUploadDir)
  app.use expressValidator
  app.use express.cookieParser()
  app.use express.session(
    ###
    store: new mongoStore({
      db: siteConf.dbName,
      host: 'localhost'
    }),
    ###
    secret: siteConf.sessionSecret
    maxAge: new Date(Date.now() + 3600000)
  )
  app.use express.methodOverride()
  app.use stylus.middleware(
    src: __dirname + "/public"
    compress: true
  )
  app.use loadUser
  app.use checkUser
  app.use app.router
  app.use express.static(__dirname + "/public")
  app.use (req, res, next) ->
    res.render "404"

  app.dynamicHelpers
    user: (req, res) ->
      return {}
      req.currentUser or new User()

    scripts: (req, res) ->
      scripts = []
      scripts.push "http://localhost:8001/vogue-client.js"  if IS_LOCAL_MACHINE
      scripts

    cssScripts: (req, res) ->
      scripts = []
      scripts

    isFirefox: (req, res) ->
      getIsFirefox req

  process.on "uncaughtException", (err) ->
    console.log "ZQX Caught Exception: ", err

app.configure "development", ->
  app.use express.logger()
  app.use express.errorHandler(
    dumpExceptions: true
    showStack: true
  )

app.configure "production", ->
  app.use express.logger()

app.configure "test", ->
  app.use express.errorHandler(
    dumpExceptions: true
    showStack: true
  )

app.error (err, req, res, next) ->
  console.log "ZQX GOT ERROR, in app.error"
  console.log err
  console.log err.stack
  res.render "500.jade",
    error: err

models.defineModels mongoose, ->
  app.Transcription = Transcription = mongoose.model("Transcription")
  app.User = User = mongoose.model("User")
  app.LoginToken = LoginToken = mongoose.model("LoginToken")
  app.Bounty = Bounty = mongoose.model("Bounty")
  db = mongoose.connect(app.set("db-uri"))


###//**********************************
// Routes
//**********************************###
app.get "/", (req, res) ->
  res.render "index",
    locals:
      trCount: 5
      userCount: 5

app.get "/privacy", (req, res) ->
  res.render "privacy"

app.get "/upload", member, (req, res) ->
  res.render "upload", {}

app.get "/about", (req, res) ->
  res.render "about"



###
  Transcription.count({}, function(err, trCount) {
    if (err) {
      throw new Error(err);
    }
    User.count({}, function(err, userCount) {
      if (err) {
        throw new Error(err);
      }
      res.render('index', {
        locals: {
          trCount: trCount,
          userCount: userCount
        }
      });
    });
  });
makeEmailList();
Transcription.find({title: 'Unknown'}, function(err, trs) {
  trs.forEach(function(tr) {
    if (tr.title === 'Unknown') {
      tr.title = tr.fileLocation;
    }
    tr.save();
    /*
    if (!tr.uploadTime) {
      tr.uploadTime = 1327262166151;
      tr.save();
    }

  });
});
User.find({}, function(err, users) {
  users.forEach(function(user) {
    if (user.karmaPoints < 10) {
      user.karmaPoints = user.karmaPoints + 10;
      user.save();
    }
  });
});
###
