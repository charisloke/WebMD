/*
# Module dependencies.
*/
var Bounty, IS_LOCAL_MACHINE, LoginToken, TRANSCRIPTION_FILE_DIR, Transcription, User, app, authenticateFromLoginToken, check, checkUser, db, exec, express, expressValidator, fs, getIsFirefox, getReadableTime, jade, loadUser, member, models, mongoStore, mongoose, path, puts, sanitize, serverDir, siteConf, stylus, sys, validateErr;

express = require("express");

jade = require("jade");

expressValidator = require("express-validator");

check = require("validator").check;

sanitize = require("validator").sanitize;

app = module.exports = express.createServer();

mongoose = require("mongoose");

mongoStore = require("connect-mongo");

models = require("./models");

stylus = require("stylus");

siteConf = require("./siteConfig.js");

fs = require("fs");

path = require("path");

db = void 0;

Transcription = void 0;

User = void 0;

LoginToken = void 0;

Bounty = void 0;

sys = require("util");

exec = require("child_process").exec;

IS_LOCAL_MACHINE = siteConf.isLocal;

TRANSCRIPTION_FILE_DIR = "/mongodb/transcriptions/";

serverDir = void 0;

if (IS_LOCAL_MACHINE) {
  serverDir = "/Users/Varun/Documents/workspace/jazz/jazz/";
} else {
  serverDir = "/var/jazz/";
}

/***********************************
// Helper functions
**********************************
*/

puts = function(error, stdout, stderr) {
  return sys.puts(stdout);
};

getIsFirefox = function(req) {
  return /firefox/i.test(req.headers["user-agent"]);
};

authenticateFromLoginToken = function(req, res, next) {
  var cookie;
  cookie = JSON.parse(req.cookies.logintoken);
  return LoginToken.findOne({
    username: cookie.username,
    series: cookie.series,
    token: cookie.token
  }, (function(err, token) {
    if (!token) {
      next();
      return;
    }
    return User.findOne({
      username: token.username
    }, function(err, user) {
      if (user) {
        req.session.user_id = user.id;
        req.currentUser = user;
        token.token = token.randomToken();
        return token.save(function() {
          res.cookie("logintoken", token.cookieValue, {
            expires: new Date(Date.now() + 2 * 604800000),
            path: "/"
          });
          return next();
        });
      } else {
        return next();
      }
    });
  }));
};

getReadableTime = function(mill) {};

/*//**********************************
//Middleware
//**********************************
*/

member = function(req, res, next) {
  if (!req.currentUser) {
    return res.redirect("/register");
  } else {
    return next();
  }
};

loadUser = function(req, res, next) {
  return next();
};

checkUser = function(req, res, next) {
  return next();
};

validateErr = function(req, res, next) {
  req.onValidationError(function(msg) {
    console.log("Validation Error: " + msg);
    throw new Error(msg);
  });
  return next();
};

app.listen(3000);

app.configure(function() {
  var fileUploadDir;
  app.set("db-uri", "mongodb://nodejitsu:5e445078e063c9e14b2b1c8efacdac33@staff.mongohq.com:10076/nodejitsudb254655919034");
  app.set("views", __dirname + "/views");
  app.set("view engine", "jade");
  app.set("view options", {
    pretty: false
  });
  fileUploadDir = void 0;
  if (IS_LOCAL_MACHINE) {
    fileUploadDir = "/Users/Varun/tmp/transcriptions/";
  } else {
    fileUploadDir = TRANSCRIPTION_FILE_DIR + "tmp/";
  }
  app.use(express.bodyParser({
    uploadDir: fileUploadDir
  }));
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
    src: __dirname + "/public",
    compress: true
  }));
  app.use(loadUser);
  app.use(checkUser);
  app.use(app.router);
  app.use(express.static(__dirname + "/public"));
  app.use(function(req, res, next) {
    return res.render("404");
  });
  app.dynamicHelpers({
    user: function(req, res) {
      return {};
      return req.currentUser || new User();
    },
    scripts: function(req, res) {
      var scripts;
      scripts = [];
      if (IS_LOCAL_MACHINE) scripts.push("http://localhost:8001/vogue-client.js");
      return scripts;
    },
    cssScripts: function(req, res) {
      var scripts;
      scripts = [];
      return scripts;
    },
    isFirefox: function(req, res) {
      return getIsFirefox(req);
    }
  });
  return process.on("uncaughtException", function(err) {
    return console.log("ZQX Caught Exception: ", err);
  });
});

app.configure("development", function() {
  app.use(express.logger());
  return app.use(express.errorHandler({
    dumpExceptions: true,
    showStack: true
  }));
});

app.configure("production", function() {
  return app.use(express.logger());
});

app.configure("test", function() {
  return app.use(express.errorHandler({
    dumpExceptions: true,
    showStack: true
  }));
});

app.error(function(err, req, res, next) {
  console.log("ZQX GOT ERROR, in app.error");
  console.log(err);
  console.log(err.stack);
  return res.render("500.jade", {
    error: err
  });
});

models.defineModels(mongoose, function() {
  app.Transcription = Transcription = mongoose.model("Transcription");
  app.User = User = mongoose.model("User");
  app.LoginToken = LoginToken = mongoose.model("LoginToken");
  app.Bounty = Bounty = mongoose.model("Bounty");
  return db = mongoose.connect(app.set("db-uri"));
});

/*//**********************************
// Routes
//**********************************
*/

app.get("/", function(req, res) {
  return res.render("index", {
    locals: {
      trCount: 5,
      userCount: 5
    }
  });
});

app.get("/privacy", function(req, res) {
  return res.render("privacy");
});

app.get("/upload", member, function(req, res) {
  return res.render("upload", {});
});

app.get("/about", function(req, res) {
  return res.render("about");
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
