/**
 * Module dependencies.
 */

var express = require('express'),
  jade = require('jade'),
  expressValidator = require('express-validator'),
  check = require('validator').check,
  sanitize = require('validator').sanitize,
  app = module.exports = express.createServer(),
  mongoose = require('mongoose'),
  mongoStore = require('connect-mongo'),
  models = require('./models'),
  stylus = require('stylus'),
  siteConf = require('./siteConfig.js'),
  fs = require('fs'),
  path = require('path'),
  db,
  Transcription, User, LoginToken, Bounty;
  //routes = require('./routes')

var sys = require('util');
var exec = require('child_process').exec;
function puts(error, stdout, stderr) { sys.puts(stdout) }

// Configuration
var IS_LOCAL_MACHINE = siteConf.isLocal;
var TRANSCRIPTION_FILE_DIR = '/mongodb/transcriptions/';

var serverDir;
if (IS_LOCAL_MACHINE) {
  serverDir = '/Users/Varun/Documents/workspace/jazz/jazz/';
} else {
  serverDir = '/var/jazz/';
}
//process.chdir(serverDir);

function getIsFirefox(req) {
  return (/firefox/i).test(req.headers['user-agent']);
}
app.configure(function(){
  //app.set('db-uri', 'mongodb://localhost/' + siteConf.dbName);
  app.set('db-uri', "mongodb://nodejitsu:5e445078e063c9e14b2b1c8efacdac33@staff.mongohq.com:10076/nodejitsudb254655919034");

  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  // set pretty to false for editable fields in transcriptionDisplay
  // Extra whitespace added when editing AARGHHH
  app.set('view options', {pretty: false});
  //app.set('db-uri', 'mongodb://transcriptionhub:spam1601@staff.mongohq.com:10093/jazz');
  var fileUploadDir;
  if (IS_LOCAL_MACHINE) {
    fileUploadDir = '/Users/Varun/tmp/transcriptions/';
  } else {
    fileUploadDir = TRANSCRIPTION_FILE_DIR + 'tmp/';
  }

  app.use(express.bodyParser({uploadDir: fileUploadDir}));
  app.use(expressValidator);

  app.use(express.cookieParser());
  app.use(express.session({
    /*
    store: new mongoStore({
      db: siteConf.dbName,
      host: 'localhost'
    }),
    */
    secret: siteConf.sessionSecret,
    maxAge: new Date(Date.now() + 3600000)
  }));
  app.use(express.methodOverride());
  app.use(stylus.middleware({
    src: __dirname + '/public',
    compress: true
  }));
  app.use(loadUser);
  app.use(checkUser);
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
  app.use(function(req, res, next) {
    res.render('404');
  });

  app.dynamicHelpers({
    user: function(req, res) {
      return {};
      return req.currentUser || new User();
    },
    scripts: function(req, res) {
      var scripts = [];
      if (IS_LOCAL_MACHINE) {
        scripts.push('http://localhost:8001/vogue-client.js');
      }
      return scripts;
    },
    cssScripts: function(req, res) {
      var scripts = [];
      return scripts;
    },
    isFirefox: function(req, res) {
      return getIsFirefox(req);
    }
  });
  process.on('uncaughtException', function(err) {
    console.log("ZQX Caught Exception: ", err);
  });

});

app.configure('development', function(){
  //app.use(express.logger({format: ':method :uri' }));
  app.use(express.logger());
  app.use(express.errorHandler({
    dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
  app.use(express.logger());
  //app.use(express.errorHandler());
});

app.configure('test', function() {
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

// Error
app.error(function(err, req, res, next) {
  console.log("ZQX GOT ERROR, in app.error");
  console.log(err);
  console.log(err.stack);
  res.render('500.jade', {
    error: err
  });
});

models.defineModels(mongoose, function() {
    app.Transcription = Transcription = mongoose.model('Transcription');
    app.User = User = mongoose.model('User');
    app.LoginToken = LoginToken = mongoose.model('LoginToken');
    app.Bounty = Bounty = mongoose.model('Bounty');
    db = mongoose.connect(app.set('db-uri'));
});



//**********************************
// Helper functions
//**********************************

function authenticateFromLoginToken(req, res, next) {
  var cookie = JSON.parse(req.cookies.logintoken);

  LoginToken.findOne({ username: cookie.username,
                       series: cookie.series,
                       token: cookie.token }, (function(err, token) {
    if (!token) {
      next();
      return;
    }

    User.findOne({ username: token.username }, function(err, user) {
      if (user) {
        req.session.user_id = user.id;
        req.currentUser = user;

        token.token = token.randomToken();
        token.save(function() {
          res.cookie('logintoken', token.cookieValue, { expires: new Date(Date.now() + 2 * 604800000), path: '/' });
          next();
        });
      } else {
        next();
      }
    });
  }));
}

function getReadableTime(mill) {
}


//**********************************
//Middleware
//**********************************

function member(req, res, next) {
  if (!req.currentUser) {
      res.redirect('/register');
  } else {
    next();
  }
}
function loadUser(req, res, next) {
  next();
  /*
  function foundUser(err, user) {
    if (user) {
      req.currentUser = user;
      next();
    }
  }
  if (req.session.user_id) {
    User.findById(req.session.user_id, foundUser);
  } else if (req.cookies.logintoken) {
    authenticateFromLoginToken(req, res, next);
  } else {
    next();
  }
  */
}
function checkUser(req, res, next) {
  //console.log(req.currentUser);
  next();
}
function validateErr(req, res, next) {
  req.onValidationError(function(msg) {
    console.log('Validation Error: ' + msg);
    throw new Error(msg);
  });
  next();
}

app.listen(3000);
//console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);



//**********************************
// Routes
//**********************************

app.get('/svg', function(req, res) {
  throw new Error('fake error!');
  res.render('svg', {layout: ''});
});
app.get('/', function(req, res) {
  res.render('index', {
    locals: {
      trCount: 5,
      userCount: 5
    }
  });
  /*
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
  */
});
app.get('/privacy', function(req, res) {
  res.render('privacy');
});

app.get('/upload', member, function(req, res) {
  res.render('upload', {
  });
});
app.get('/about', function(req, res) {
  res.render('about');
});

/*
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
*/
