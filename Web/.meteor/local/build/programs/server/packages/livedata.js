(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var check = Package.check.check;
var Match = Package.check.Match;
var Random = Package.random.Random;
var EJSON = Package.ejson.EJSON;
var _ = Package.underscore._;
var Deps = Package.deps.Deps;
var Log = Package.logging.Log;
var LocalCollection = Package.minimongo.LocalCollection;

/* Package-scope variables */
var DDP, DDPServer, LivedataTest, toSockjsUrl, toWebsocketUrl, StreamServer, Server, SUPPORTED_DDP_VERSIONS, MethodInvocation, parseDDP, stringifyDDP, allConnections;

(function () {

//////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                          //
// packages/livedata/common.js                                                                              //
//                                                                                                          //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                            //
LivedataTest = {};                                                                                          // 1
                                                                                                            // 2
//////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

//////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                          //
// packages/livedata/stream_client_nodejs.js                                                                //
//                                                                                                          //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                            //
// @param endpoint {String} URL to Meteor app                                                               // 1
//   "http://subdomain.meteor.com/" or "/" or                                                               // 2
//   "ddp+sockjs://foo-**.meteor.com/sockjs"                                                                // 3
//                                                                                                          // 4
// We do some rewriting of the URL to eventually make it "ws://" or "wss://",                               // 5
// whatever was passed in.  At the very least, what Meteor.absoluteUrl() returns                            // 6
// us should work.                                                                                          // 7
//                                                                                                          // 8
// We don't do any heartbeating. (The logic that did this in sockjs was removed,                            // 9
// because it used a built-in sockjs mechanism. We could do it with WebSocket                               // 10
// ping frames or with DDP-level messages.)                                                                 // 11
LivedataTest.ClientStream = function (endpoint) {                                                           // 12
  var self = this;                                                                                          // 13
                                                                                                            // 14
  // WebSocket-Node https://github.com/Worlize/WebSocket-Node                                               // 15
  // Chosen because it can run without native components. It has a                                          // 16
  // somewhat idiosyncratic API. We may want to use 'ws' instead in the                                     // 17
  // future.                                                                                                // 18
  //                                                                                                        // 19
  // Since server-to-server DDP is still an experimental feature, we only                                   // 20
  // require the module if we actually create a server-to-server                                            // 21
  // connection. This is a minor efficiency improvement, but moreover: while                                // 22
  // 'websocket' doesn't require native components, it tries to use some                                    // 23
  // optional native components and prints a warning if it can't load                                       // 24
  // them. Since native components in packages don't work when transferred to                               // 25
  // other architectures yet, this means that require('websocket') prints a                                 // 26
  // spammy log message when deployed to another architecture. Delaying the                                 // 27
  // require means you only get the log message if you're actually using the                                // 28
  // feature.                                                                                               // 29
  self.client = new (Npm.require('websocket').client)();                                                    // 30
  self.endpoint = endpoint;                                                                                 // 31
  self.currentConnection = null;                                                                            // 32
                                                                                                            // 33
  self.client.on('connect', function (connection) {                                                         // 34
    return self._onConnect(connection);                                                                     // 35
  });                                                                                                       // 36
                                                                                                            // 37
  self.client.on('connectFailed', function (error) {                                                        // 38
    // XXX: Make this do something better than make the tests hang if it does not work.                     // 39
    return self._lostConnection();                                                                          // 40
  });                                                                                                       // 41
                                                                                                            // 42
  self._initCommon();                                                                                       // 43
                                                                                                            // 44
  self.expectingWelcome = false;                                                                            // 45
  //// Kickoff!                                                                                             // 46
  self._launchConnection();                                                                                 // 47
};                                                                                                          // 48
                                                                                                            // 49
_.extend(LivedataTest.ClientStream.prototype, {                                                             // 50
                                                                                                            // 51
  // data is a utf8 string. Data sent while not connected is dropped on                                     // 52
  // the floor, and it is up the user of this API to retransmit lost                                        // 53
  // messages on 'reset'                                                                                    // 54
  send: function (data) {                                                                                   // 55
    var self = this;                                                                                        // 56
    if (self.currentStatus.connected) {                                                                     // 57
      self.currentConnection.send(data);                                                                    // 58
    }                                                                                                       // 59
  },                                                                                                        // 60
                                                                                                            // 61
  // Changes where this connection points                                                                   // 62
  _changeUrl: function (url) {                                                                              // 63
    var self = this;                                                                                        // 64
    self.endpoint = url;                                                                                    // 65
  },                                                                                                        // 66
                                                                                                            // 67
  _onConnect: function (connection) {                                                                       // 68
    var self = this;                                                                                        // 69
                                                                                                            // 70
    if (self._forcedToDisconnect) {                                                                         // 71
      // We were asked to disconnect between trying to open the connection and                              // 72
      // actually opening it. Let's just pretend this never happened.                                       // 73
      connection.close();                                                                                   // 74
      return;                                                                                               // 75
    }                                                                                                       // 76
                                                                                                            // 77
    if (self.currentStatus.connected) {                                                                     // 78
      // We already have a connection. It must have been the case that                                      // 79
      // we started two parallel connection attempts (because we                                            // 80
      // wanted to 'reconnect now' on a hanging connection and we had                                       // 81
      // no way to cancel the connection attempt.) Just ignore/close                                        // 82
      // the latecomer.                                                                                     // 83
      connection.close();                                                                                   // 84
      return;                                                                                               // 85
    }                                                                                                       // 86
                                                                                                            // 87
    if (self.connectionTimer) {                                                                             // 88
      clearTimeout(self.connectionTimer);                                                                   // 89
      self.connectionTimer = null;                                                                          // 90
    }                                                                                                       // 91
                                                                                                            // 92
    connection.on('error', function (error) {                                                               // 93
      if (self.currentConnection !== this)                                                                  // 94
        return;                                                                                             // 95
                                                                                                            // 96
      Meteor._debug("stream error", error.toString(),                                                       // 97
                    (new Date()).toDateString());                                                           // 98
      self._lostConnection();                                                                               // 99
    });                                                                                                     // 100
                                                                                                            // 101
    connection.on('close', function () {                                                                    // 102
      if (self.currentConnection !== this)                                                                  // 103
        return;                                                                                             // 104
                                                                                                            // 105
      self._lostConnection();                                                                               // 106
    });                                                                                                     // 107
                                                                                                            // 108
    self.expectingWelcome = true;                                                                           // 109
    connection.on('message', function (message) {                                                           // 110
      if (self.currentConnection !== this)                                                                  // 111
        return; // old connection still emitting messages                                                   // 112
                                                                                                            // 113
      if (self.expectingWelcome) {                                                                          // 114
        // Discard the first message that comes across the                                                  // 115
        // connection. It is the hot code push version identifier and                                       // 116
        // is not actually part of DDP.                                                                     // 117
        self.expectingWelcome = false;                                                                      // 118
        return;                                                                                             // 119
      }                                                                                                     // 120
                                                                                                            // 121
      if (message.type === "utf8") // ignore binary frames                                                  // 122
        _.each(self.eventCallbacks.message, function (callback) {                                           // 123
          callback(message.utf8Data);                                                                       // 124
        });                                                                                                 // 125
    });                                                                                                     // 126
                                                                                                            // 127
    // update status                                                                                        // 128
    self.currentConnection = connection;                                                                    // 129
    self.currentStatus.status = "connected";                                                                // 130
    self.currentStatus.connected = true;                                                                    // 131
    self.currentStatus.retryCount = 0;                                                                      // 132
    self.statusChanged();                                                                                   // 133
                                                                                                            // 134
    // fire resets. This must come after status change so that clients                                      // 135
    // can call send from within a reset callback.                                                          // 136
    _.each(self.eventCallbacks.reset, function (callback) { callback(); });                                 // 137
  },                                                                                                        // 138
                                                                                                            // 139
  _cleanup: function () {                                                                                   // 140
    var self = this;                                                                                        // 141
                                                                                                            // 142
    self._clearConnectionTimer();                                                                           // 143
    if (self.currentConnection) {                                                                           // 144
      self.currentConnection.close();                                                                       // 145
      self.currentConnection = null;                                                                        // 146
    }                                                                                                       // 147
  },                                                                                                        // 148
                                                                                                            // 149
  _clearConnectionTimer: function () {                                                                      // 150
    var self = this;                                                                                        // 151
                                                                                                            // 152
    if (self.connectionTimer) {                                                                             // 153
      clearTimeout(self.connectionTimer);                                                                   // 154
      self.connectionTimer = null;                                                                          // 155
    }                                                                                                       // 156
  },                                                                                                        // 157
                                                                                                            // 158
  _launchConnection: function () {                                                                          // 159
    var self = this;                                                                                        // 160
    self._cleanup(); // cleanup the old socket, if there was one.                                           // 161
                                                                                                            // 162
    // launch a connect attempt. we have no way to track it. we either                                      // 163
    // get an _onConnect event, or we don't.                                                                // 164
                                                                                                            // 165
    // XXX: set up a timeout on this.                                                                       // 166
                                                                                                            // 167
    // we would like to specify 'ddp' as the protocol here, but                                             // 168
    // unfortunately WebSocket-Node fails the handshake if we ask for                                       // 169
    // a protocol and the server doesn't send one back (and sockjs                                          // 170
    // doesn't). also, related: I guess we have to accept that                                              // 171
    // 'stream' is ddp-specific                                                                             // 172
    self.client.connect(toWebsocketUrl(self.endpoint));                                                     // 173
                                                                                                            // 174
    if (self.connectionTimer)                                                                               // 175
      clearTimeout(self.connectionTimer);                                                                   // 176
    self.connectionTimer = setTimeout(                                                                      // 177
      _.bind(self._lostConnection, self),                                                                   // 178
      self.CONNECT_TIMEOUT);                                                                                // 179
  }                                                                                                         // 180
});                                                                                                         // 181
                                                                                                            // 182
//////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

//////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                          //
// packages/livedata/stream_client_common.js                                                                //
//                                                                                                          //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                            //
// XXX from Underscore.String (http://epeli.github.com/underscore.string/)                                  // 1
var startsWith = function(str, starts) {                                                                    // 2
  return str.length >= starts.length &&                                                                     // 3
    str.substring(0, starts.length) === starts;                                                             // 4
};                                                                                                          // 5
var endsWith = function(str, ends) {                                                                        // 6
  return str.length >= ends.length &&                                                                       // 7
    str.substring(str.length - ends.length) === ends;                                                       // 8
};                                                                                                          // 9
                                                                                                            // 10
// @param url {String} URL to Meteor app, eg:                                                               // 11
//   "/" or "madewith.meteor.com" or "https://foo.meteor.com"                                               // 12
//   or "ddp+sockjs://ddp--****-foo.meteor.com/sockjs"                                                      // 13
// @returns {String} URL to the endpoint with the specific scheme and subPath, e.g.                         // 14
// for scheme "http" and subPath "sockjs"                                                                   // 15
//   "http://subdomain.meteor.com/sockjs" or "/sockjs"                                                      // 16
//   or "https://ddp--1234-foo.meteor.com/sockjs"                                                           // 17
var translateUrl =  function(url, newSchemeBase, subPath) {                                                 // 18
  if (! newSchemeBase) {                                                                                    // 19
    newSchemeBase = "http";                                                                                 // 20
  }                                                                                                         // 21
                                                                                                            // 22
  var ddpUrlMatch = url.match(/^ddp(i?)\+sockjs:\/\//);                                                     // 23
  var httpUrlMatch = url.match(/^http(s?):\/\//);                                                           // 24
  var newScheme;                                                                                            // 25
  if (ddpUrlMatch) {                                                                                        // 26
    // Remove scheme and split off the host.                                                                // 27
    var urlAfterDDP = url.substr(ddpUrlMatch[0].length);                                                    // 28
    newScheme = ddpUrlMatch[1] === "i" ? newSchemeBase : newSchemeBase + "s";                               // 29
    var slashPos = urlAfterDDP.indexOf('/');                                                                // 30
    var host =                                                                                              // 31
          slashPos === -1 ? urlAfterDDP : urlAfterDDP.substr(0, slashPos);                                  // 32
    var rest = slashPos === -1 ? '' : urlAfterDDP.substr(slashPos);                                         // 33
                                                                                                            // 34
    // In the host (ONLY!), change '*' characters into random digits. This                                  // 35
    // allows different stream connections to connect to different hostnames                                // 36
    // and avoid browser per-hostname connection limits.                                                    // 37
    host = host.replace(/\*/g, function () {                                                                // 38
      return Math.floor(Random.fraction()*10);                                                              // 39
    });                                                                                                     // 40
                                                                                                            // 41
    return newScheme + '://' + host + rest;                                                                 // 42
  } else if (httpUrlMatch) {                                                                                // 43
    newScheme = !httpUrlMatch[1] ? newSchemeBase : newSchemeBase + "s";                                     // 44
    var urlAfterHttp = url.substr(httpUrlMatch[0].length);                                                  // 45
    url = newScheme + "://" + urlAfterHttp;                                                                 // 46
  }                                                                                                         // 47
                                                                                                            // 48
  // Prefix FQDNs but not relative URLs                                                                     // 49
  if (url.indexOf("://") === -1 && !startsWith(url, "/")) {                                                 // 50
    url = newSchemeBase + "://" + url;                                                                      // 51
  }                                                                                                         // 52
                                                                                                            // 53
  url = Meteor._relativeToSiteRootUrl(url);                                                                 // 54
                                                                                                            // 55
  if (endsWith(url, "/"))                                                                                   // 56
    return url + subPath;                                                                                   // 57
  else                                                                                                      // 58
    return url + "/" + subPath;                                                                             // 59
};                                                                                                          // 60
                                                                                                            // 61
toSockjsUrl = function (url) {                                                                              // 62
  return translateUrl(url, "http", "sockjs");                                                               // 63
};                                                                                                          // 64
                                                                                                            // 65
toWebsocketUrl = function (url) {                                                                           // 66
  var ret = translateUrl(url, "ws", "websocket");                                                           // 67
  return ret;                                                                                               // 68
};                                                                                                          // 69
                                                                                                            // 70
LivedataTest.toSockjsUrl = toSockjsUrl;                                                                     // 71
                                                                                                            // 72
                                                                                                            // 73
_.extend(LivedataTest.ClientStream.prototype, {                                                             // 74
                                                                                                            // 75
  // Register for callbacks.                                                                                // 76
  on: function (name, callback) {                                                                           // 77
    var self = this;                                                                                        // 78
                                                                                                            // 79
    if (name !== 'message' && name !== 'reset' && name !== 'update_available')                              // 80
      throw new Error("unknown event type: " + name);                                                       // 81
                                                                                                            // 82
    if (!self.eventCallbacks[name])                                                                         // 83
      self.eventCallbacks[name] = [];                                                                       // 84
    self.eventCallbacks[name].push(callback);                                                               // 85
  },                                                                                                        // 86
                                                                                                            // 87
                                                                                                            // 88
  _initCommon: function () {                                                                                // 89
    var self = this;                                                                                        // 90
    //// Constants                                                                                          // 91
                                                                                                            // 92
    // how long to wait until we declare the connection attempt                                             // 93
    // failed.                                                                                              // 94
    self.CONNECT_TIMEOUT = 10000;                                                                           // 95
                                                                                                            // 96
                                                                                                            // 97
    // time for initial reconnect attempt.                                                                  // 98
    self.RETRY_BASE_TIMEOUT = 1000;                                                                         // 99
    // exponential factor to increase timeout each attempt.                                                 // 100
    self.RETRY_EXPONENT = 2.2;                                                                              // 101
    // maximum time between reconnects. keep this intentionally                                             // 102
    // high-ish to ensure a server can recover from a failure caused                                        // 103
    // by load                                                                                              // 104
    self.RETRY_MAX_TIMEOUT = 5 * 60000; // 5 minutes                                                        // 105
    // time to wait for the first 2 retries.  this helps page reload                                        // 106
    // speed during dev mode restarts, but doesn't hurt prod too                                            // 107
    // much (due to CONNECT_TIMEOUT)                                                                        // 108
    self.RETRY_MIN_TIMEOUT = 10;                                                                            // 109
    // how many times to try to reconnect 'instantly'                                                       // 110
    self.RETRY_MIN_COUNT = 2;                                                                               // 111
    // fuzz factor to randomize reconnect times by. avoid reconnect                                         // 112
    // storms.                                                                                              // 113
    self.RETRY_FUZZ = 0.5; // +- 25%                                                                        // 114
                                                                                                            // 115
                                                                                                            // 116
                                                                                                            // 117
    self.eventCallbacks = {}; // name -> [callback]                                                         // 118
                                                                                                            // 119
    self._forcedToDisconnect = false;                                                                       // 120
                                                                                                            // 121
    //// Reactive status                                                                                    // 122
    self.currentStatus = {                                                                                  // 123
      status: "connecting",                                                                                 // 124
      connected: false,                                                                                     // 125
      retryCount: 0                                                                                         // 126
    };                                                                                                      // 127
                                                                                                            // 128
                                                                                                            // 129
    self.statusListeners = typeof Deps !== 'undefined' && new Deps.Dependency;                              // 130
    self.statusChanged = function () {                                                                      // 131
      if (self.statusListeners)                                                                             // 132
        self.statusListeners.changed();                                                                     // 133
    };                                                                                                      // 134
                                                                                                            // 135
    //// Retry logic                                                                                        // 136
    self.retryTimer = null;                                                                                 // 137
    self.connectionTimer = null;                                                                            // 138
                                                                                                            // 139
  },                                                                                                        // 140
                                                                                                            // 141
  // Trigger a reconnect.                                                                                   // 142
  reconnect: function (options) {                                                                           // 143
    var self = this;                                                                                        // 144
    options = options || {};                                                                                // 145
                                                                                                            // 146
    if (options.url) {                                                                                      // 147
      self._changeUrl(options.url);                                                                         // 148
    }                                                                                                       // 149
                                                                                                            // 150
    if (self.currentStatus.connected) {                                                                     // 151
      if (options._force || options.url) {                                                                  // 152
        // force reconnect.                                                                                 // 153
        self._lostConnection();                                                                             // 154
      } // else, noop.                                                                                      // 155
      return;                                                                                               // 156
    }                                                                                                       // 157
                                                                                                            // 158
    // if we're mid-connection, stop it.                                                                    // 159
    if (self.currentStatus.status === "connecting") {                                                       // 160
      self._lostConnection();                                                                               // 161
    }                                                                                                       // 162
                                                                                                            // 163
    if (self.retryTimer)                                                                                    // 164
      clearTimeout(self.retryTimer);                                                                        // 165
    self.retryTimer = null;                                                                                 // 166
    self.currentStatus.retryCount -= 1; // don't count manual retries                                       // 167
    self._retryNow();                                                                                       // 168
  },                                                                                                        // 169
                                                                                                            // 170
  disconnect: function (options) {                                                                          // 171
    var self = this;                                                                                        // 172
    options = options || {};                                                                                // 173
                                                                                                            // 174
    // Failed is permanent. If we're failed, don't let people go back                                       // 175
    // online by calling 'disconnect' then 'reconnect'.                                                     // 176
    if (self._forcedToDisconnect)                                                                           // 177
      return;                                                                                               // 178
                                                                                                            // 179
    // If _permanent is set, permanently disconnect a stream. Once a stream                                 // 180
    // is forced to disconnect, it can never reconnect. This is for                                         // 181
    // error cases such as ddp version mismatch, where trying again                                         // 182
    // won't fix the problem.                                                                               // 183
    if (options._permanent) {                                                                               // 184
      self._forcedToDisconnect = true;                                                                      // 185
    }                                                                                                       // 186
                                                                                                            // 187
    self._cleanup();                                                                                        // 188
    if (self.retryTimer) {                                                                                  // 189
      clearTimeout(self.retryTimer);                                                                        // 190
      self.retryTimer = null;                                                                               // 191
    }                                                                                                       // 192
                                                                                                            // 193
    self.currentStatus = {                                                                                  // 194
      status: (options._permanent ? "failed" : "offline"),                                                  // 195
      connected: false,                                                                                     // 196
      retryCount: 0                                                                                         // 197
    };                                                                                                      // 198
                                                                                                            // 199
    if (options._permanent && options._error)                                                               // 200
      self.currentStatus.reason = options._error;                                                           // 201
                                                                                                            // 202
    self.statusChanged();                                                                                   // 203
  },                                                                                                        // 204
                                                                                                            // 205
  _lostConnection: function () {                                                                            // 206
    var self = this;                                                                                        // 207
                                                                                                            // 208
    self._cleanup();                                                                                        // 209
    self._retryLater(); // sets status. no need to do it here.                                              // 210
  },                                                                                                        // 211
                                                                                                            // 212
  _retryTimeout: function (count) {                                                                         // 213
    var self = this;                                                                                        // 214
                                                                                                            // 215
    if (count < self.RETRY_MIN_COUNT)                                                                       // 216
      return self.RETRY_MIN_TIMEOUT;                                                                        // 217
                                                                                                            // 218
    var timeout = Math.min(                                                                                 // 219
      self.RETRY_MAX_TIMEOUT,                                                                               // 220
      self.RETRY_BASE_TIMEOUT * Math.pow(self.RETRY_EXPONENT, count));                                      // 221
    // fuzz the timeout randomly, to avoid reconnect storms when a                                          // 222
    // server goes down.                                                                                    // 223
    timeout = timeout * ((Random.fraction() * self.RETRY_FUZZ) +                                            // 224
                         (1 - self.RETRY_FUZZ/2));                                                          // 225
    return timeout;                                                                                         // 226
  },                                                                                                        // 227
                                                                                                            // 228
  // fired when we detect that we've gone online. try to reconnect                                          // 229
  // immediately.                                                                                           // 230
  _online: function () {                                                                                    // 231
    // if we've requested to be offline by disconnecting, don't reconnect.                                  // 232
    if (this.currentStatus.status != "offline")                                                             // 233
      this.reconnect();                                                                                     // 234
  },                                                                                                        // 235
                                                                                                            // 236
  _retryLater: function () {                                                                                // 237
    var self = this;                                                                                        // 238
                                                                                                            // 239
    var timeout = self._retryTimeout(self.currentStatus.retryCount);                                        // 240
    if (self.retryTimer)                                                                                    // 241
      clearTimeout(self.retryTimer);                                                                        // 242
    self.retryTimer = setTimeout(_.bind(self._retryNow, self), timeout);                                    // 243
                                                                                                            // 244
    self.currentStatus.status = "waiting";                                                                  // 245
    self.currentStatus.connected = false;                                                                   // 246
    self.currentStatus.retryTime = (new Date()).getTime() + timeout;                                        // 247
    self.statusChanged();                                                                                   // 248
  },                                                                                                        // 249
                                                                                                            // 250
  _retryNow: function () {                                                                                  // 251
    var self = this;                                                                                        // 252
                                                                                                            // 253
    if (self._forcedToDisconnect)                                                                           // 254
      return;                                                                                               // 255
                                                                                                            // 256
    self.currentStatus.retryCount += 1;                                                                     // 257
    self.currentStatus.status = "connecting";                                                               // 258
    self.currentStatus.connected = false;                                                                   // 259
    delete self.currentStatus.retryTime;                                                                    // 260
    self.statusChanged();                                                                                   // 261
                                                                                                            // 262
    self._launchConnection();                                                                               // 263
  },                                                                                                        // 264
                                                                                                            // 265
                                                                                                            // 266
  // Get current status. Reactive.                                                                          // 267
  status: function () {                                                                                     // 268
    var self = this;                                                                                        // 269
    if (self.statusListeners)                                                                               // 270
      self.statusListeners.depend();                                                                        // 271
    return self.currentStatus;                                                                              // 272
  }                                                                                                         // 273
});                                                                                                         // 274
                                                                                                            // 275
//////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

//////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                          //
// packages/livedata/stream_server.js                                                                       //
//                                                                                                          //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                            //
// unique id for this instantiation of the server. If this changes                                          // 1
// between client reconnects, the client will reload. You can set the                                       // 2
// environment variable "SERVER_ID" to control this. For example, if                                        // 3
// you want to only force a reload on major changes, you can use a                                          // 4
// custom serverId which you only change when something worth pushing                                       // 5
// to clients immediately happens.                                                                          // 6
__meteor_runtime_config__.serverId =                                                                        // 7
  process.env.SERVER_ID ? process.env.SERVER_ID : Random.id();                                              // 8
                                                                                                            // 9
var pathPrefix = __meteor_runtime_config__.ROOT_URL_PATH_PREFIX ||  "";                                     // 10
                                                                                                            // 11
StreamServer = function () {                                                                                // 12
  var self = this;                                                                                          // 13
  self.registration_callbacks = [];                                                                         // 14
  self.open_sockets = [];                                                                                   // 15
                                                                                                            // 16
  // Because we are installing directly onto WebApp.httpServer instead of using                             // 17
  // WebApp.app, we have to process the path prefix ourselves.                                              // 18
  self.prefix = pathPrefix + '/sockjs';                                                                     // 19
  // routepolicy is only a weak dependency, because we don't need it if we're                               // 20
  // just doing server-to-server DDP as a client.                                                           // 21
  if (Package.routepolicy) {                                                                                // 22
    Package.routepolicy.RoutePolicy.declare(self.prefix + '/', 'network');                                  // 23
  }                                                                                                         // 24
                                                                                                            // 25
  // set up sockjs                                                                                          // 26
  var sockjs = Npm.require('sockjs');                                                                       // 27
  var serverOptions = {                                                                                     // 28
    prefix: self.prefix,                                                                                    // 29
    log: function() {},                                                                                     // 30
    // this is the default, but we code it explicitly because we depend                                     // 31
    // on it in stream_client:HEARTBEAT_TIMEOUT                                                             // 32
    heartbeat_delay: 25000,                                                                                 // 33
    // The default disconnect_delay is 5 seconds, but if the server ends up CPU                             // 34
    // bound for that much time, SockJS might not notice that the user has                                  // 35
    // reconnected because the timer (of disconnect_delay ms) can fire before                               // 36
    // SockJS processes the new connection. Eventually we'll fix this by not                                // 37
    // combining CPU-heavy processing with SockJS termination (eg a proxy which                             // 38
    // converts to Unix sockets) but for now, raise the delay.                                              // 39
    disconnect_delay: 60 * 1000,                                                                            // 40
    // Set the USE_JSESSIONID environment variable to enable setting the                                    // 41
    // JSESSIONID cookie. This is useful for setting up proxies with                                        // 42
    // session affinity.                                                                                    // 43
    jsessionid: !!process.env.USE_JSESSIONID                                                                // 44
  };                                                                                                        // 45
                                                                                                            // 46
  // If you know your server environment (eg, proxies) will prevent websockets                              // 47
  // from ever working, set $DISABLE_WEBSOCKETS and SockJS clients (ie,                                     // 48
  // browsers) will not waste time attempting to use them.                                                  // 49
  // (Your server will still have a /websocket endpoint.)                                                   // 50
  if (process.env.DISABLE_WEBSOCKETS)                                                                       // 51
    serverOptions.websocket = false;                                                                        // 52
                                                                                                            // 53
  self.server = sockjs.createServer(serverOptions);                                                         // 54
  if (!Package.webapp) {                                                                                    // 55
    throw new Error("Cannot create a DDP server without the webapp package");                               // 56
  }                                                                                                         // 57
  self.server.installHandlers(Package.webapp.WebApp.httpServer);                                            // 58
                                                                                                            // 59
  // Support the /websocket endpoint                                                                        // 60
  self._redirectWebsocketEndpoint();                                                                        // 61
                                                                                                            // 62
  self.server.on('connection', function (socket) {                                                          // 63
    socket.send = function (data) {                                                                         // 64
      socket.write(data);                                                                                   // 65
    };                                                                                                      // 66
    socket.on('close', function () {                                                                        // 67
      self.open_sockets = _.without(self.open_sockets, socket);                                             // 68
    });                                                                                                     // 69
    self.open_sockets.push(socket);                                                                         // 70
                                                                                                            // 71
                                                                                                            // 72
    // Send a welcome message with the serverId. Client uses this to                                        // 73
    // reload if needed.                                                                                    // 74
    socket.send(JSON.stringify({server_id: __meteor_runtime_config__.serverId}));                           // 75
                                                                                                            // 76
    // call all our callbacks when we get a new socket. they will do the                                    // 77
    // work of setting up handlers and such for specific messages.                                          // 78
    _.each(self.registration_callbacks, function (callback) {                                               // 79
      callback(socket);                                                                                     // 80
    });                                                                                                     // 81
  });                                                                                                       // 82
                                                                                                            // 83
};                                                                                                          // 84
                                                                                                            // 85
_.extend(StreamServer.prototype, {                                                                          // 86
  // call my callback when a new socket connects.                                                           // 87
  // also call it for all current connections.                                                              // 88
  register: function (callback) {                                                                           // 89
    var self = this;                                                                                        // 90
    self.registration_callbacks.push(callback);                                                             // 91
    _.each(self.all_sockets(), function (socket) {                                                          // 92
      callback(socket);                                                                                     // 93
    });                                                                                                     // 94
  },                                                                                                        // 95
                                                                                                            // 96
  // get a list of all sockets                                                                              // 97
  all_sockets: function () {                                                                                // 98
    var self = this;                                                                                        // 99
    return _.values(self.open_sockets);                                                                     // 100
  },                                                                                                        // 101
                                                                                                            // 102
  // Redirect /websocket to /sockjs/websocket in order to not expose                                        // 103
  // sockjs to clients that want to use raw websockets                                                      // 104
  _redirectWebsocketEndpoint: function() {                                                                  // 105
    var self = this;                                                                                        // 106
    // Unfortunately we can't use a connect middleware here since                                           // 107
    // sockjs installs itself prior to all existing listeners                                               // 108
    // (meaning prior to any connect middlewares) so we need to take                                        // 109
    // an approach similar to overshadowListeners in                                                        // 110
    // https://github.com/sockjs/sockjs-node/blob/cf820c55af6a9953e16558555a31decea554f70e/src/utils.coffee // 111
    _.each(['request', 'upgrade'], function(event) {                                                        // 112
      var httpServer = Package.webapp.WebApp.httpServer;                                                    // 113
      var oldHttpServerListeners = httpServer.listeners(event).slice(0);                                    // 114
      httpServer.removeAllListeners(event);                                                                 // 115
                                                                                                            // 116
      // request and upgrade have different arguments passed but                                            // 117
      // we only care about the first one which is always request                                           // 118
      var newListener = function(request /*, moreArguments */) {                                            // 119
        // Store arguments for use within the closure below                                                 // 120
        var args = arguments;                                                                               // 121
                                                                                                            // 122
        if (request.url === pathPrefix + '/websocket' ||                                                    // 123
            request.url === pathPrefix + '/websocket/') {                                                   // 124
          request.url = self.prefix + '/websocket';                                                         // 125
        }                                                                                                   // 126
        _.each(oldHttpServerListeners, function(oldListener) {                                              // 127
          oldListener.apply(httpServer, args);                                                              // 128
        });                                                                                                 // 129
      };                                                                                                    // 130
      httpServer.addListener(event, newListener);                                                           // 131
    });                                                                                                     // 132
  }                                                                                                         // 133
});                                                                                                         // 134
                                                                                                            // 135
//////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

//////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                          //
// packages/livedata/livedata_server.js                                                                     //
//                                                                                                          //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                            //
DDPServer = {};                                                                                             // 1
                                                                                                            // 2
var Fiber = Npm.require('fibers');                                                                          // 3
                                                                                                            // 4
// This file contains classes:                                                                              // 5
// * Session - The server's connection to a single DDP client                                               // 6
// * Subscription - A single subscription for a single client                                               // 7
// * Server - An entire server that may talk to > 1 client. A DDP endpoint.                                 // 8
//                                                                                                          // 9
// Session and Subscription are file scope. For now, until we freeze                                        // 10
// the interface, Server is package scope (in the future it should be                                       // 11
// exported.)                                                                                               // 12
                                                                                                            // 13
// Represents a single document in a SessionCollectionView                                                  // 14
var SessionDocumentView = function () {                                                                     // 15
  var self = this;                                                                                          // 16
  self.existsIn = {}; // set of subscriptionHandle                                                          // 17
  self.dataByKey = {}; // key-> [ {subscriptionHandle, value} by precedence]                                // 18
};                                                                                                          // 19
                                                                                                            // 20
_.extend(SessionDocumentView.prototype, {                                                                   // 21
                                                                                                            // 22
  getFields: function () {                                                                                  // 23
    var self = this;                                                                                        // 24
    var ret = {};                                                                                           // 25
    _.each(self.dataByKey, function (precedenceList, key) {                                                 // 26
      ret[key] = precedenceList[0].value;                                                                   // 27
    });                                                                                                     // 28
    return ret;                                                                                             // 29
  },                                                                                                        // 30
                                                                                                            // 31
  clearField: function (subscriptionHandle, key, changeCollector) {                                         // 32
    var self = this;                                                                                        // 33
    // Publish API ignores _id if present in fields                                                         // 34
    if (key === "_id")                                                                                      // 35
      return;                                                                                               // 36
    var precedenceList = self.dataByKey[key];                                                               // 37
                                                                                                            // 38
    // It's okay to clear fields that didn't exist. No need to throw                                        // 39
    // an error.                                                                                            // 40
    if (!precedenceList)                                                                                    // 41
      return;                                                                                               // 42
                                                                                                            // 43
    var removedValue = undefined;                                                                           // 44
    for (var i = 0; i < precedenceList.length; i++) {                                                       // 45
      var precedence = precedenceList[i];                                                                   // 46
      if (precedence.subscriptionHandle === subscriptionHandle) {                                           // 47
        // The view's value can only change if this subscription is the one that                            // 48
        // used to have precedence.                                                                         // 49
        if (i === 0)                                                                                        // 50
          removedValue = precedence.value;                                                                  // 51
        precedenceList.splice(i, 1);                                                                        // 52
        break;                                                                                              // 53
      }                                                                                                     // 54
    }                                                                                                       // 55
    if (_.isEmpty(precedenceList)) {                                                                        // 56
      delete self.dataByKey[key];                                                                           // 57
      changeCollector[key] = undefined;                                                                     // 58
    } else if (removedValue !== undefined &&                                                                // 59
               !EJSON.equals(removedValue, precedenceList[0].value)) {                                      // 60
      changeCollector[key] = precedenceList[0].value;                                                       // 61
    }                                                                                                       // 62
  },                                                                                                        // 63
                                                                                                            // 64
  changeField: function (subscriptionHandle, key, value,                                                    // 65
                         changeCollector, isAdd) {                                                          // 66
    var self = this;                                                                                        // 67
    // Publish API ignores _id if present in fields                                                         // 68
    if (key === "_id")                                                                                      // 69
      return;                                                                                               // 70
    if (!_.has(self.dataByKey, key)) {                                                                      // 71
      self.dataByKey[key] = [{subscriptionHandle: subscriptionHandle,                                       // 72
                              value: value}];                                                               // 73
      changeCollector[key] = value;                                                                         // 74
      return;                                                                                               // 75
    }                                                                                                       // 76
    var precedenceList = self.dataByKey[key];                                                               // 77
    var elt;                                                                                                // 78
    if (!isAdd) {                                                                                           // 79
      elt = _.find(precedenceList, function (precedence) {                                                  // 80
        return precedence.subscriptionHandle === subscriptionHandle;                                        // 81
      });                                                                                                   // 82
    }                                                                                                       // 83
                                                                                                            // 84
    if (elt) {                                                                                              // 85
      if (elt === precedenceList[0] && !EJSON.equals(value, elt.value)) {                                   // 86
        // this subscription is changing the value of this field.                                           // 87
        changeCollector[key] = value;                                                                       // 88
      }                                                                                                     // 89
      elt.value = value;                                                                                    // 90
    } else {                                                                                                // 91
      // this subscription is newly caring about this field                                                 // 92
      precedenceList.push({subscriptionHandle: subscriptionHandle, value: value});                          // 93
    }                                                                                                       // 94
                                                                                                            // 95
  }                                                                                                         // 96
});                                                                                                         // 97
                                                                                                            // 98
// Represents a client's view of a single collection                                                        // 99
var SessionCollectionView = function (collectionName, sessionCallbacks) {                                   // 100
  var self = this;                                                                                          // 101
  self.collectionName = collectionName;                                                                     // 102
  self.documents = {};                                                                                      // 103
  self.callbacks = sessionCallbacks;                                                                        // 104
};                                                                                                          // 105
                                                                                                            // 106
LivedataTest.SessionCollectionView = SessionCollectionView;                                                 // 107
                                                                                                            // 108
                                                                                                            // 109
_.extend(SessionCollectionView.prototype, {                                                                 // 110
                                                                                                            // 111
  isEmpty: function () {                                                                                    // 112
    var self = this;                                                                                        // 113
    return _.isEmpty(self.documents);                                                                       // 114
  },                                                                                                        // 115
                                                                                                            // 116
  diff: function (previous) {                                                                               // 117
    var self = this;                                                                                        // 118
    LocalCollection._diffObjects(previous.documents, self.documents, {                                      // 119
      both: _.bind(self.diffDocument, self),                                                                // 120
                                                                                                            // 121
      rightOnly: function (id, nowDV) {                                                                     // 122
        self.callbacks.added(self.collectionName, id, nowDV.getFields());                                   // 123
      },                                                                                                    // 124
                                                                                                            // 125
      leftOnly: function (id, prevDV) {                                                                     // 126
        self.callbacks.removed(self.collectionName, id);                                                    // 127
      }                                                                                                     // 128
    });                                                                                                     // 129
  },                                                                                                        // 130
                                                                                                            // 131
  diffDocument: function (id, prevDV, nowDV) {                                                              // 132
    var self = this;                                                                                        // 133
    var fields = {};                                                                                        // 134
    LocalCollection._diffObjects(prevDV.getFields(), nowDV.getFields(), {                                   // 135
      both: function (key, prev, now) {                                                                     // 136
        if (!EJSON.equals(prev, now))                                                                       // 137
          fields[key] = now;                                                                                // 138
      },                                                                                                    // 139
      rightOnly: function (key, now) {                                                                      // 140
        fields[key] = now;                                                                                  // 141
      },                                                                                                    // 142
      leftOnly: function(key, prev) {                                                                       // 143
        fields[key] = undefined;                                                                            // 144
      }                                                                                                     // 145
    });                                                                                                     // 146
    self.callbacks.changed(self.collectionName, id, fields);                                                // 147
  },                                                                                                        // 148
                                                                                                            // 149
  added: function (subscriptionHandle, id, fields) {                                                        // 150
    var self = this;                                                                                        // 151
    var docView = self.documents[id];                                                                       // 152
    var added = false;                                                                                      // 153
    if (!docView) {                                                                                         // 154
      added = true;                                                                                         // 155
      docView = new SessionDocumentView();                                                                  // 156
      self.documents[id] = docView;                                                                         // 157
    }                                                                                                       // 158
    docView.existsIn[subscriptionHandle] = true;                                                            // 159
    var changeCollector = {};                                                                               // 160
    _.each(fields, function (value, key) {                                                                  // 161
      docView.changeField(                                                                                  // 162
        subscriptionHandle, key, value, changeCollector, true);                                             // 163
    });                                                                                                     // 164
    if (added)                                                                                              // 165
      self.callbacks.added(self.collectionName, id, changeCollector);                                       // 166
    else                                                                                                    // 167
      self.callbacks.changed(self.collectionName, id, changeCollector);                                     // 168
  },                                                                                                        // 169
                                                                                                            // 170
  changed: function (subscriptionHandle, id, changed) {                                                     // 171
    var self = this;                                                                                        // 172
    var changedResult = {};                                                                                 // 173
    var docView = self.documents[id];                                                                       // 174
    if (!docView)                                                                                           // 175
      throw new Error("Could not find element with id " + id + " to change");                               // 176
    _.each(changed, function (value, key) {                                                                 // 177
      if (value === undefined)                                                                              // 178
        docView.clearField(subscriptionHandle, key, changedResult);                                         // 179
      else                                                                                                  // 180
        docView.changeField(subscriptionHandle, key, value, changedResult);                                 // 181
    });                                                                                                     // 182
    self.callbacks.changed(self.collectionName, id, changedResult);                                         // 183
  },                                                                                                        // 184
                                                                                                            // 185
  removed: function (subscriptionHandle, id) {                                                              // 186
    var self = this;                                                                                        // 187
    var docView = self.documents[id];                                                                       // 188
    if (!docView) {                                                                                         // 189
      var err = new Error("Removed nonexistent document " + id);                                            // 190
      throw err;                                                                                            // 191
    }                                                                                                       // 192
    delete docView.existsIn[subscriptionHandle];                                                            // 193
    if (_.isEmpty(docView.existsIn)) {                                                                      // 194
      // it is gone from everyone                                                                           // 195
      self.callbacks.removed(self.collectionName, id);                                                      // 196
      delete self.documents[id];                                                                            // 197
    } else {                                                                                                // 198
      var changed = {};                                                                                     // 199
      // remove this subscription from every precedence list                                                // 200
      // and record the changes                                                                             // 201
      _.each(docView.dataByKey, function (precedenceList, key) {                                            // 202
        docView.clearField(subscriptionHandle, key, changed);                                               // 203
      });                                                                                                   // 204
                                                                                                            // 205
      self.callbacks.changed(self.collectionName, id, changed);                                             // 206
    }                                                                                                       // 207
  }                                                                                                         // 208
});                                                                                                         // 209
                                                                                                            // 210
/******************************************************************************/                            // 211
/* Session                                                                    */                            // 212
/******************************************************************************/                            // 213
                                                                                                            // 214
var Session = function (server, version, socket) {                                                          // 215
  var self = this;                                                                                          // 216
  self.id = Random.id();                                                                                    // 217
                                                                                                            // 218
  self.server = server;                                                                                     // 219
  self.version = version;                                                                                   // 220
                                                                                                            // 221
  self.initialized = false;                                                                                 // 222
  self.socket = socket;                                                                                     // 223
                                                                                                            // 224
  self.inQueue = [];                                                                                        // 225
  self.blocked = false;                                                                                     // 226
  self.workerRunning = false;                                                                               // 227
                                                                                                            // 228
  // Sub objects for active subscriptions                                                                   // 229
  self._namedSubs = {};                                                                                     // 230
  self._universalSubs = [];                                                                                 // 231
                                                                                                            // 232
  self.userId = null;                                                                                       // 233
                                                                                                            // 234
  // Per-connection scratch area. This is only used internally, but we                                      // 235
  // should have real and documented API for this sort of thing someday.                                    // 236
  self.sessionData = {};                                                                                    // 237
                                                                                                            // 238
  self.collectionViews = {};                                                                                // 239
                                                                                                            // 240
  // Set this to false to not send messages when collectionViews are                                        // 241
  // modified. This is done when rerunning subs in _setUserId and those messages                            // 242
  // are calculated via a diff instead.                                                                     // 243
  self._isSending = true;                                                                                   // 244
                                                                                                            // 245
  // If this is true, don't start a newly-created universal publisher on this                               // 246
  // session. The session will take care of starting it when appropriate.                                   // 247
  self._dontStartNewUniversalSubs = false;                                                                  // 248
                                                                                                            // 249
  // when we are rerunning subscriptions, any ready messages                                                // 250
  // we want to buffer up for when we are done rerunning subscriptions                                      // 251
  self._pendingReady = [];                                                                                  // 252
                                                                                                            // 253
  socket.send(stringifyDDP({msg: 'connected',                                                               // 254
                            session: self.id}));                                                            // 255
  // On initial connect, spin up all the universal publishers.                                              // 256
  Fiber(function () {                                                                                       // 257
    self.startUniversalSubs();                                                                              // 258
  }).run();                                                                                                 // 259
};                                                                                                          // 260
                                                                                                            // 261
_.extend(Session.prototype, {                                                                               // 262
                                                                                                            // 263
                                                                                                            // 264
  sendReady: function (subscriptionIds) {                                                                   // 265
    var self = this;                                                                                        // 266
    if (self._isSending)                                                                                    // 267
      self.send({msg: "ready", subs: subscriptionIds});                                                     // 268
    else {                                                                                                  // 269
      _.each(subscriptionIds, function (subscriptionId) {                                                   // 270
        self._pendingReady.push(subscriptionId);                                                            // 271
      });                                                                                                   // 272
    }                                                                                                       // 273
  },                                                                                                        // 274
                                                                                                            // 275
  sendAdded: function (collectionName, id, fields) {                                                        // 276
    var self = this;                                                                                        // 277
    if (self._isSending)                                                                                    // 278
      self.send({msg: "added", collection: collectionName, id: id, fields: fields});                        // 279
  },                                                                                                        // 280
                                                                                                            // 281
  sendChanged: function (collectionName, id, fields) {                                                      // 282
    var self = this;                                                                                        // 283
    if (_.isEmpty(fields))                                                                                  // 284
      return;                                                                                               // 285
                                                                                                            // 286
    if (self._isSending) {                                                                                  // 287
      self.send({                                                                                           // 288
        msg: "changed",                                                                                     // 289
        collection: collectionName,                                                                         // 290
        id: id,                                                                                             // 291
        fields: fields                                                                                      // 292
      });                                                                                                   // 293
    }                                                                                                       // 294
  },                                                                                                        // 295
                                                                                                            // 296
  sendRemoved: function (collectionName, id) {                                                              // 297
    var self = this;                                                                                        // 298
    if (self._isSending)                                                                                    // 299
      self.send({msg: "removed", collection: collectionName, id: id});                                      // 300
  },                                                                                                        // 301
                                                                                                            // 302
  getSendCallbacks: function () {                                                                           // 303
    var self = this;                                                                                        // 304
    return {                                                                                                // 305
      added: _.bind(self.sendAdded, self),                                                                  // 306
      changed: _.bind(self.sendChanged, self),                                                              // 307
      removed: _.bind(self.sendRemoved, self)                                                               // 308
    };                                                                                                      // 309
  },                                                                                                        // 310
                                                                                                            // 311
  getCollectionView: function (collectionName) {                                                            // 312
    var self = this;                                                                                        // 313
    if (_.has(self.collectionViews, collectionName)) {                                                      // 314
      return self.collectionViews[collectionName];                                                          // 315
    }                                                                                                       // 316
    var ret = new SessionCollectionView(collectionName,                                                     // 317
                                        self.getSendCallbacks());                                           // 318
    self.collectionViews[collectionName] = ret;                                                             // 319
    return ret;                                                                                             // 320
  },                                                                                                        // 321
                                                                                                            // 322
  added: function (subscriptionHandle, collectionName, id, fields) {                                        // 323
    var self = this;                                                                                        // 324
    var view = self.getCollectionView(collectionName);                                                      // 325
    view.added(subscriptionHandle, id, fields);                                                             // 326
  },                                                                                                        // 327
                                                                                                            // 328
  removed: function (subscriptionHandle, collectionName, id) {                                              // 329
    var self = this;                                                                                        // 330
    var view = self.getCollectionView(collectionName);                                                      // 331
    view.removed(subscriptionHandle, id);                                                                   // 332
    if (view.isEmpty()) {                                                                                   // 333
      delete self.collectionViews[collectionName];                                                          // 334
    }                                                                                                       // 335
  },                                                                                                        // 336
                                                                                                            // 337
  changed: function (subscriptionHandle, collectionName, id, fields) {                                      // 338
    var self = this;                                                                                        // 339
    var view = self.getCollectionView(collectionName);                                                      // 340
    view.changed(subscriptionHandle, id, fields);                                                           // 341
  },                                                                                                        // 342
                                                                                                            // 343
                                                                                                            // 344
  startUniversalSubs: function () {                                                                         // 345
    var self = this;                                                                                        // 346
    // Make a shallow copy of the set of universal handlers and start them. If                              // 347
    // additional universal publishers start while we're running them (due to                               // 348
    // yielding), they will run separately as part of Server.publish.                                       // 349
    var handlers = _.clone(self.server.universal_publish_handlers);                                         // 350
    _.each(handlers, function (handler) {                                                                   // 351
      self._startSubscription(handler);                                                                     // 352
    });                                                                                                     // 353
  },                                                                                                        // 354
                                                                                                            // 355
  // Destroy this session. Stop all processing and tear everything                                          // 356
  // down. If a socket was attached, close it.                                                              // 357
  destroy: function () {                                                                                    // 358
    var self = this;                                                                                        // 359
    if (self.socket) {                                                                                      // 360
      self.socket.close();                                                                                  // 361
      self.socket._meteorSession = null;                                                                    // 362
    }                                                                                                       // 363
    Meteor.defer(function () {                                                                              // 364
      // stop callbacks can yield, so we defer this on destroy.                                             // 365
      // see also _closeAllForTokens and its desire to destroy things in a loop.                            // 366
      self._deactivateAllSubscriptions();                                                                   // 367
    });                                                                                                     // 368
    // Drop the merge box data immediately.                                                                 // 369
    self.collectionViews = {};                                                                              // 370
    self.inQueue = null;                                                                                    // 371
  },                                                                                                        // 372
                                                                                                            // 373
  // Send a message (doing nothing if no socket is connected right now.)                                    // 374
  // It should be a JSON object (it will be stringified.)                                                   // 375
  send: function (msg) {                                                                                    // 376
    var self = this;                                                                                        // 377
    if (self.socket) {                                                                                      // 378
      if (Meteor._printSentDDP)                                                                             // 379
        Meteor._debug("Sent DDP", stringifyDDP(msg));                                                       // 380
      self.socket.send(stringifyDDP(msg));                                                                  // 381
    }                                                                                                       // 382
  },                                                                                                        // 383
                                                                                                            // 384
  // Send a connection error.                                                                               // 385
  sendError: function (reason, offendingMessage) {                                                          // 386
    var self = this;                                                                                        // 387
    var msg = {msg: 'error', reason: reason};                                                               // 388
    if (offendingMessage)                                                                                   // 389
      msg.offendingMessage = offendingMessage;                                                              // 390
    self.send(msg);                                                                                         // 391
  },                                                                                                        // 392
                                                                                                            // 393
  // Process 'msg' as an incoming message. (But as a guard against                                          // 394
  // race conditions during reconnection, ignore the message if                                             // 395
  // 'socket' is not the currently connected socket.)                                                       // 396
  //                                                                                                        // 397
  // We run the messages from the client one at a time, in the order                                        // 398
  // given by the client. The message handler is passed an idempotent                                       // 399
  // function 'unblock' which it may call to allow other messages to                                        // 400
  // begin running in parallel in another fiber (for example, a method                                      // 401
  // that wants to yield.) Otherwise, it is automatically unblocked                                         // 402
  // when it returns.                                                                                       // 403
  //                                                                                                        // 404
  // Actually, we don't have to 'totally order' the messages in this                                        // 405
  // way, but it's the easiest thing that's correct. (unsub needs to                                        // 406
  // be ordered against sub, methods need to be ordered against each                                        // 407
  // other.)                                                                                                // 408
  processMessage: function (msg_in) {                                                                       // 409
    var self = this;                                                                                        // 410
    if (!self.inQueue) // we have been destroyed.                                                           // 411
      return;                                                                                               // 412
                                                                                                            // 413
    self.inQueue.push(msg_in);                                                                              // 414
    if (self.workerRunning)                                                                                 // 415
      return;                                                                                               // 416
    self.workerRunning = true;                                                                              // 417
                                                                                                            // 418
    var processNext = function () {                                                                         // 419
      var msg = self.inQueue && self.inQueue.shift();                                                       // 420
      if (!msg) {                                                                                           // 421
        self.workerRunning = false;                                                                         // 422
        return;                                                                                             // 423
      }                                                                                                     // 424
                                                                                                            // 425
      Fiber(function () {                                                                                   // 426
        var blocked = true;                                                                                 // 427
                                                                                                            // 428
        var unblock = function () {                                                                         // 429
          if (!blocked)                                                                                     // 430
            return; // idempotent                                                                           // 431
          blocked = false;                                                                                  // 432
          processNext();                                                                                    // 433
        };                                                                                                  // 434
                                                                                                            // 435
        if (_.has(self.protocol_handlers, msg.msg))                                                         // 436
          self.protocol_handlers[msg.msg].call(self, msg, unblock);                                         // 437
        else                                                                                                // 438
          self.sendError('Bad request', msg);                                                               // 439
        unblock(); // in case the handler didn't already do it                                              // 440
      }).run();                                                                                             // 441
    };                                                                                                      // 442
                                                                                                            // 443
    processNext();                                                                                          // 444
  },                                                                                                        // 445
                                                                                                            // 446
  protocol_handlers: {                                                                                      // 447
    sub: function (msg) {                                                                                   // 448
      var self = this;                                                                                      // 449
                                                                                                            // 450
      // reject malformed messages                                                                          // 451
      if (typeof (msg.id) !== "string" ||                                                                   // 452
          typeof (msg.name) !== "string" ||                                                                 // 453
          (('params' in msg) && !(msg.params instanceof Array))) {                                          // 454
        self.sendError("Malformed subscription", msg);                                                      // 455
        return;                                                                                             // 456
      }                                                                                                     // 457
                                                                                                            // 458
      if (!self.server.publish_handlers[msg.name]) {                                                        // 459
        self.send({                                                                                         // 460
          msg: 'nosub', id: msg.id,                                                                         // 461
          error: new Meteor.Error(404, "Subscription not found")});                                         // 462
        return;                                                                                             // 463
      }                                                                                                     // 464
                                                                                                            // 465
      if (_.has(self._namedSubs, msg.id))                                                                   // 466
        // subs are idempotent, or rather, they are ignored if a sub                                        // 467
        // with that id already exists. this is important during                                            // 468
        // reconnect.                                                                                       // 469
        return;                                                                                             // 470
                                                                                                            // 471
      var handler = self.server.publish_handlers[msg.name];                                                 // 472
      self._startSubscription(handler, msg.id, msg.params, msg.name);                                       // 473
                                                                                                            // 474
    },                                                                                                      // 475
                                                                                                            // 476
    unsub: function (msg) {                                                                                 // 477
      var self = this;                                                                                      // 478
                                                                                                            // 479
      self._stopSubscription(msg.id);                                                                       // 480
    },                                                                                                      // 481
                                                                                                            // 482
    method: function (msg, unblock) {                                                                       // 483
      var self = this;                                                                                      // 484
                                                                                                            // 485
      // reject malformed messages                                                                          // 486
      // XXX should also reject messages with unknown attributes?                                           // 487
      if (typeof (msg.id) !== "string" ||                                                                   // 488
          typeof (msg.method) !== "string" ||                                                               // 489
          (('params' in msg) && !(msg.params instanceof Array))) {                                          // 490
        self.sendError("Malformed method invocation", msg);                                                 // 491
        return;                                                                                             // 492
      }                                                                                                     // 493
                                                                                                            // 494
      // set up to mark the method as satisfied once all observers                                          // 495
      // (and subscriptions) have reacted to any writes that were                                           // 496
      // done.                                                                                              // 497
      var fence = new DDPServer._WriteFence;                                                                // 498
      fence.onAllCommitted(function () {                                                                    // 499
        // Retire the fence so that future writes are allowed.                                              // 500
        // This means that callbacks like timers are free to use                                            // 501
        // the fence, and if they fire before it's armed (for                                               // 502
        // example, because the method waits for them) their                                                // 503
        // writes will be included in the fence.                                                            // 504
        fence.retire();                                                                                     // 505
        self.send({                                                                                         // 506
          msg: 'updated', methods: [msg.id]});                                                              // 507
      });                                                                                                   // 508
                                                                                                            // 509
      // find the handler                                                                                   // 510
      var handler = self.server.method_handlers[msg.method];                                                // 511
      if (!handler) {                                                                                       // 512
        self.send({                                                                                         // 513
          msg: 'result', id: msg.id,                                                                        // 514
          error: new Meteor.Error(404, "Method not found")});                                               // 515
        fence.arm();                                                                                        // 516
        return;                                                                                             // 517
      }                                                                                                     // 518
                                                                                                            // 519
      var setUserId = function(userId) {                                                                    // 520
        self._setUserId(userId);                                                                            // 521
      };                                                                                                    // 522
                                                                                                            // 523
      var setLoginToken = function (newToken) {                                                             // 524
        self._setLoginToken(newToken);                                                                      // 525
      };                                                                                                    // 526
                                                                                                            // 527
      var invocation = new MethodInvocation({                                                               // 528
        isSimulation: false,                                                                                // 529
        userId: self.userId,                                                                                // 530
        setUserId: setUserId,                                                                               // 531
        _setLoginToken: setLoginToken,                                                                      // 532
        unblock: unblock,                                                                                   // 533
        sessionData: self.sessionData                                                                       // 534
      });                                                                                                   // 535
      try {                                                                                                 // 536
        var result = DDPServer._CurrentWriteFence.withValue(fence, function () {                            // 537
          return DDP._CurrentInvocation.withValue(invocation, function () {                                 // 538
            return maybeAuditArgumentChecks(                                                                // 539
              handler, invocation, msg.params, "call to '" + msg.method + "'");                             // 540
          });                                                                                               // 541
        });                                                                                                 // 542
      } catch (e) {                                                                                         // 543
        var exception = e;                                                                                  // 544
      }                                                                                                     // 545
                                                                                                            // 546
      fence.arm(); // we're done adding writes to the fence                                                 // 547
      unblock(); // unblock, if the method hasn't done it already                                           // 548
                                                                                                            // 549
      exception = wrapInternalException(                                                                    // 550
        exception, "while invoking method '" + msg.method + "'");                                           // 551
                                                                                                            // 552
      // send response and add to cache                                                                     // 553
      var payload =                                                                                         // 554
        exception ? {error: exception} : (result !== undefined ?                                            // 555
                                          {result: result} : {});                                           // 556
      self.send(_.extend({msg: 'result', id: msg.id}, payload));                                            // 557
    }                                                                                                       // 558
  },                                                                                                        // 559
                                                                                                            // 560
  _eachSub: function (f) {                                                                                  // 561
    var self = this;                                                                                        // 562
    _.each(self._namedSubs, f);                                                                             // 563
    _.each(self._universalSubs, f);                                                                         // 564
  },                                                                                                        // 565
                                                                                                            // 566
  _diffCollectionViews: function (beforeCVs) {                                                              // 567
    var self = this;                                                                                        // 568
    LocalCollection._diffObjects(beforeCVs, self.collectionViews, {                                         // 569
      both: function (collectionName, leftValue, rightValue) {                                              // 570
        rightValue.diff(leftValue);                                                                         // 571
      },                                                                                                    // 572
      rightOnly: function (collectionName, rightValue) {                                                    // 573
        _.each(rightValue.documents, function (docView, id) {                                               // 574
          self.sendAdded(collectionName, id, docView.getFields());                                          // 575
        });                                                                                                 // 576
      },                                                                                                    // 577
      leftOnly: function (collectionName, leftValue) {                                                      // 578
        _.each(leftValue.documents, function (doc, id) {                                                    // 579
          self.sendRemoved(collectionName, id);                                                             // 580
        });                                                                                                 // 581
      }                                                                                                     // 582
    });                                                                                                     // 583
  },                                                                                                        // 584
                                                                                                            // 585
  // XXX This mixes accounts concerns (login tokens) into livedata, which is not                            // 586
  // ideal. Eventually we'll have an API that allows accounts to keep track of                              // 587
  // which connections are associated with tokens and close them when necessary,                            // 588
  // rather than the current state of things where accounts tells livedata which                            // 589
  // connections are associated with which tokens, and when to close connections                            // 590
  // associated with a given token.                                                                         // 591
  _setLoginToken: function (newToken) {                                                                     // 592
    var self = this;                                                                                        // 593
    var oldToken = self.sessionData.loginToken;                                                             // 594
    self.sessionData.loginToken = newToken;                                                                 // 595
    self.server._loginTokenChanged(self, newToken, oldToken);                                               // 596
  },                                                                                                        // 597
                                                                                                            // 598
  // Sets the current user id in all appropriate contexts and reruns                                        // 599
  // all subscriptions                                                                                      // 600
  _setUserId: function(userId) {                                                                            // 601
    var self = this;                                                                                        // 602
                                                                                                            // 603
    if (userId !== null && typeof userId !== "string")                                                      // 604
      throw new Error("setUserId must be called on string or null, not " +                                  // 605
                      typeof userId);                                                                       // 606
                                                                                                            // 607
    // Prevent newly-created universal subscriptions from being added to our                                // 608
    // session; they will be found below when we call startUniversalSubs.                                   // 609
    //                                                                                                      // 610
    // (We don't have to worry about named subscriptions, because we only add                               // 611
    // them when we process a 'sub' message. We are currently processing a                                  // 612
    // 'method' message, and the method did not unblock, because it is illegal                              // 613
    // to call setUserId after unblock. Thus we cannot be concurrently adding a                             // 614
    // new named subscription.)                                                                             // 615
    self._dontStartNewUniversalSubs = true;                                                                 // 616
                                                                                                            // 617
    // Prevent current subs from updating our collectionViews and call their                                // 618
    // stop callbacks. This may yield.                                                                      // 619
    self._eachSub(function (sub) {                                                                          // 620
      sub._deactivate();                                                                                    // 621
    });                                                                                                     // 622
                                                                                                            // 623
    // All subs should now be deactivated. Stop sending messages to the client,                             // 624
    // save the state of the published collections, reset to an empty view, and                             // 625
    // update the userId.                                                                                   // 626
    self._isSending = false;                                                                                // 627
    var beforeCVs = self.collectionViews;                                                                   // 628
    self.collectionViews = {};                                                                              // 629
    self.userId = userId;                                                                                   // 630
                                                                                                            // 631
    // Save the old named subs, and reset to having no subscriptions.                                       // 632
    var oldNamedSubs = self._namedSubs;                                                                     // 633
    self._namedSubs = {};                                                                                   // 634
    self._universalSubs = [];                                                                               // 635
                                                                                                            // 636
    _.each(oldNamedSubs, function (sub, subscriptionId) {                                                   // 637
      self._namedSubs[subscriptionId] = sub._recreate();                                                    // 638
      // nb: if the handler throws or calls this.error(), it will in fact                                   // 639
      // immediately send its 'nosub'. This is OK, though.                                                  // 640
      self._namedSubs[subscriptionId]._runHandler();                                                        // 641
    });                                                                                                     // 642
                                                                                                            // 643
    // Allow newly-created universal subs to be started on our connection in                                // 644
    // parallel with the ones we're spinning up here, and spin up universal                                 // 645
    // subs.                                                                                                // 646
    self._dontStartNewUniversalSubs = false;                                                                // 647
    self.startUniversalSubs();                                                                              // 648
                                                                                                            // 649
    // Start sending messages again, beginning with the diff from the previous                              // 650
    // state of the world to the current state. No yields are allowed during                                // 651
    // this diff, so that other changes cannot interleave.                                                  // 652
    Meteor._noYieldsAllowed(function () {                                                                   // 653
      self._isSending = true;                                                                               // 654
      self._diffCollectionViews(beforeCVs);                                                                 // 655
      if (!_.isEmpty(self._pendingReady)) {                                                                 // 656
        self.sendReady(self._pendingReady);                                                                 // 657
        self._pendingReady = [];                                                                            // 658
      }                                                                                                     // 659
    });                                                                                                     // 660
  },                                                                                                        // 661
                                                                                                            // 662
  _startSubscription: function (handler, subId, params, name) {                                             // 663
    var self = this;                                                                                        // 664
                                                                                                            // 665
    var sub = new Subscription(                                                                             // 666
      self, handler, subId, params, name);                                                                  // 667
    if (subId)                                                                                              // 668
      self._namedSubs[subId] = sub;                                                                         // 669
    else                                                                                                    // 670
      self._universalSubs.push(sub);                                                                        // 671
                                                                                                            // 672
    sub._runHandler();                                                                                      // 673
  },                                                                                                        // 674
                                                                                                            // 675
  // tear down specified subscription                                                                       // 676
  _stopSubscription: function (subId, error) {                                                              // 677
    var self = this;                                                                                        // 678
                                                                                                            // 679
    if (subId && self._namedSubs[subId]) {                                                                  // 680
      self._namedSubs[subId]._removeAllDocuments();                                                         // 681
      self._namedSubs[subId]._deactivate();                                                                 // 682
      delete self._namedSubs[subId];                                                                        // 683
    }                                                                                                       // 684
                                                                                                            // 685
    var response = {msg: 'nosub', id: subId};                                                               // 686
                                                                                                            // 687
    if (error)                                                                                              // 688
      response.error = wrapInternalException(error, "from sub " + subId);                                   // 689
                                                                                                            // 690
    self.send(response);                                                                                    // 691
  },                                                                                                        // 692
                                                                                                            // 693
  // tear down all subscriptions. Note that this does NOT send removed or nosub                             // 694
  // messages, since we assume the client is gone.                                                          // 695
  _deactivateAllSubscriptions: function () {                                                                // 696
    var self = this;                                                                                        // 697
                                                                                                            // 698
    _.each(self._namedSubs, function (sub, id) {                                                            // 699
      sub._deactivate();                                                                                    // 700
    });                                                                                                     // 701
    self._namedSubs = {};                                                                                   // 702
                                                                                                            // 703
    _.each(self._universalSubs, function (sub) {                                                            // 704
      sub._deactivate();                                                                                    // 705
    });                                                                                                     // 706
    self._universalSubs = [];                                                                               // 707
  }                                                                                                         // 708
                                                                                                            // 709
});                                                                                                         // 710
                                                                                                            // 711
/******************************************************************************/                            // 712
/* Subscription                                                               */                            // 713
/******************************************************************************/                            // 714
                                                                                                            // 715
// ctor for a sub handle: the input to each publish function                                                // 716
var Subscription = function (                                                                               // 717
    session, handler, subscriptionId, params, name) {                                                       // 718
  var self = this;                                                                                          // 719
  self._session = session; // type is Session                                                               // 720
                                                                                                            // 721
  self._handler = handler;                                                                                  // 722
                                                                                                            // 723
  // my subscription ID (generated by client, undefined for universal subs).                                // 724
  self._subscriptionId = subscriptionId;                                                                    // 725
  // undefined for universal subs                                                                           // 726
  self._name = name;                                                                                        // 727
                                                                                                            // 728
  self._params = params || [];                                                                              // 729
                                                                                                            // 730
  // Only named subscriptions have IDs, but we need some sort of string                                     // 731
  // internally to keep track of all subscriptions inside                                                   // 732
  // SessionDocumentViews. We use this subscriptionHandle for that.                                         // 733
  if (self._subscriptionId) {                                                                               // 734
    self._subscriptionHandle = 'N' + self._subscriptionId;                                                  // 735
  } else {                                                                                                  // 736
    self._subscriptionHandle = 'U' + Random.id();                                                           // 737
  }                                                                                                         // 738
                                                                                                            // 739
  // has _deactivate been called?                                                                           // 740
  self._deactivated = false;                                                                                // 741
                                                                                                            // 742
  // stop callbacks to g/c this sub.  called w/ zero arguments.                                             // 743
  self._stopCallbacks = [];                                                                                 // 744
                                                                                                            // 745
  // the set of (collection, documentid) that this subscription has                                         // 746
  // an opinion about                                                                                       // 747
  self._documents = {};                                                                                     // 748
                                                                                                            // 749
  // remember if we are ready.                                                                              // 750
  self._ready = false;                                                                                      // 751
                                                                                                            // 752
  // Part of the public API: the user of this sub.                                                          // 753
  self.userId = session.userId;                                                                             // 754
                                                                                                            // 755
  // For now, the id filter is going to default to                                                          // 756
  // the to/from DDP methods on LocalCollection, to                                                         // 757
  // specifically deal with mongo/minimongo ObjectIds.                                                      // 758
                                                                                                            // 759
  // Later, you will be able to make this be "raw"                                                          // 760
  // if you want to publish a collection that you know                                                      // 761
  // just has strings for keys and no funny business, to                                                    // 762
  // a ddp consumer that isn't minimongo                                                                    // 763
                                                                                                            // 764
  self._idFilter = {                                                                                        // 765
    idStringify: LocalCollection._idStringify,                                                              // 766
    idParse: LocalCollection._idParse                                                                       // 767
  };                                                                                                        // 768
};                                                                                                          // 769
                                                                                                            // 770
_.extend(Subscription.prototype, {                                                                          // 771
  _runHandler: function () {                                                                                // 772
    var self = this;                                                                                        // 773
    try {                                                                                                   // 774
      var res = maybeAuditArgumentChecks(                                                                   // 775
        self._handler, self, EJSON.clone(self._params),                                                     // 776
        "publisher '" + self._name + "'");                                                                  // 777
    } catch (e) {                                                                                           // 778
      self.error(e);                                                                                        // 779
      return;                                                                                               // 780
    }                                                                                                       // 781
                                                                                                            // 782
    // Did the handler call this.error or this.stop?                                                        // 783
    if (self._deactivated)                                                                                  // 784
      return;                                                                                               // 785
                                                                                                            // 786
    // SPECIAL CASE: Instead of writing their own callbacks that invoke                                     // 787
    // this.added/changed/ready/etc, the user can just return a collection                                  // 788
    // cursor or array of cursors from the publish function; we call their                                  // 789
    // _publishCursor method which starts observing the cursor and publishes the                            // 790
    // results. Note that _publishCursor does NOT call ready().                                             // 791
    //                                                                                                      // 792
    // XXX This uses an undocumented interface which only the Mongo cursor                                  // 793
    // interface publishes. Should we make this interface public and encourage                              // 794
    // users to implement it themselves? Arguably, it's unnecessary; users can                              // 795
    // already write their own functions like                                                               // 796
    //   var publishMyReactiveThingy = function (name, handler) {                                           // 797
    //     Meteor.publish(name, function () {                                                               // 798
    //       var reactiveThingy = handler();                                                                // 799
    //       reactiveThingy.publishMe();                                                                    // 800
    //     });                                                                                              // 801
    //   };                                                                                                 // 802
    var isCursor = function (c) {                                                                           // 803
      return c && c._publishCursor;                                                                         // 804
    };                                                                                                      // 805
    if (isCursor(res)) {                                                                                    // 806
      res._publishCursor(self);                                                                             // 807
      // _publishCursor only returns after the initial added callbacks have run.                            // 808
      // mark subscription as ready.                                                                        // 809
      self.ready();                                                                                         // 810
    } else if (_.isArray(res)) {                                                                            // 811
      // check all the elements are cursors                                                                 // 812
      if (! _.all(res, isCursor)) {                                                                         // 813
        self.error(new Error("Publish function returned an array of non-Cursors"));                         // 814
        return;                                                                                             // 815
      }                                                                                                     // 816
      // find duplicate collection names                                                                    // 817
      // XXX we should support overlapping cursors, but that would require the                              // 818
      // merge box to allow overlap within a subscription                                                   // 819
      var collectionNames = {};                                                                             // 820
      for (var i = 0; i < res.length; ++i) {                                                                // 821
        var collectionName = res[i]._getCollectionName();                                                   // 822
        if (_.has(collectionNames, collectionName)) {                                                       // 823
          self.error(new Error(                                                                             // 824
            "Publish function returned multiple cursors for collection " +                                  // 825
              collectionName));                                                                             // 826
          return;                                                                                           // 827
        }                                                                                                   // 828
        collectionNames[collectionName] = true;                                                             // 829
      };                                                                                                    // 830
                                                                                                            // 831
      _.each(res, function (cur) {                                                                          // 832
        cur._publishCursor(self);                                                                           // 833
      });                                                                                                   // 834
      self.ready();                                                                                         // 835
    }                                                                                                       // 836
  },                                                                                                        // 837
                                                                                                            // 838
  // This calls all stop callbacks and prevents the handler from updating any                               // 839
  // SessionCollectionViews further. It's used when the user unsubscribes or                                // 840
  // disconnects, as well as during setUserId re-runs. It does *NOT* send                                   // 841
  // removed messages for the published objects; if that is necessary, call                                 // 842
  // _removeAllDocuments first.                                                                             // 843
  _deactivate: function() {                                                                                 // 844
    var self = this;                                                                                        // 845
    if (self._deactivated)                                                                                  // 846
      return;                                                                                               // 847
    self._deactivated = true;                                                                               // 848
    self._callStopCallbacks();                                                                              // 849
  },                                                                                                        // 850
                                                                                                            // 851
  _callStopCallbacks: function () {                                                                         // 852
    var self = this;                                                                                        // 853
    // tell listeners, so they can clean up                                                                 // 854
    var callbacks = self._stopCallbacks;                                                                    // 855
    self._stopCallbacks = [];                                                                               // 856
    _.each(callbacks, function (callback) {                                                                 // 857
      callback();                                                                                           // 858
    });                                                                                                     // 859
  },                                                                                                        // 860
                                                                                                            // 861
  // Send remove messages for every document.                                                               // 862
  _removeAllDocuments: function () {                                                                        // 863
    var self = this;                                                                                        // 864
    Meteor._noYieldsAllowed(function () {                                                                   // 865
      _.each(self._documents, function(collectionDocs, collectionName) {                                    // 866
        // Iterate over _.keys instead of the dictionary itself, since we'll be                             // 867
        // mutating it.                                                                                     // 868
        _.each(_.keys(collectionDocs), function (strId) {                                                   // 869
          self.removed(collectionName, self._idFilter.idParse(strId));                                      // 870
        });                                                                                                 // 871
      });                                                                                                   // 872
    });                                                                                                     // 873
  },                                                                                                        // 874
                                                                                                            // 875
  // Returns a new Subscription for the same session with the same                                          // 876
  // initial creation parameters. This isn't a clone: it doesn't have                                       // 877
  // the same _documents cache, stopped state or callbacks; may have a                                      // 878
  // different _subscriptionHandle, and gets its userId from the                                            // 879
  // session, not from this object.                                                                         // 880
  _recreate: function () {                                                                                  // 881
    var self = this;                                                                                        // 882
    return new Subscription(                                                                                // 883
      self._session, self._handler, self._subscriptionId, self._params);                                    // 884
  },                                                                                                        // 885
                                                                                                            // 886
  error: function (error) {                                                                                 // 887
    var self = this;                                                                                        // 888
    if (self._deactivated)                                                                                  // 889
      return;                                                                                               // 890
    self._session._stopSubscription(self._subscriptionId, error);                                           // 891
  },                                                                                                        // 892
                                                                                                            // 893
  // Note that while our DDP client will notice that you've called stop() on the                            // 894
  // server (and clean up its _subscriptions table) we don't actually provide a                             // 895
  // mechanism for an app to notice this (the subscribe onError callback only                               // 896
  // triggers if there is an error).                                                                        // 897
  stop: function () {                                                                                       // 898
    var self = this;                                                                                        // 899
    if (self._deactivated)                                                                                  // 900
      return;                                                                                               // 901
    self._session._stopSubscription(self._subscriptionId);                                                  // 902
  },                                                                                                        // 903
                                                                                                            // 904
  onStop: function (callback) {                                                                             // 905
    var self = this;                                                                                        // 906
    if (self._deactivated)                                                                                  // 907
      callback();                                                                                           // 908
    else                                                                                                    // 909
      self._stopCallbacks.push(callback);                                                                   // 910
  },                                                                                                        // 911
                                                                                                            // 912
  added: function (collectionName, id, fields) {                                                            // 913
    var self = this;                                                                                        // 914
    if (self._deactivated)                                                                                  // 915
      return;                                                                                               // 916
    id = self._idFilter.idStringify(id);                                                                    // 917
    Meteor._ensure(self._documents, collectionName)[id] = true;                                             // 918
    self._session.added(self._subscriptionHandle, collectionName, id, fields);                              // 919
  },                                                                                                        // 920
                                                                                                            // 921
  changed: function (collectionName, id, fields) {                                                          // 922
    var self = this;                                                                                        // 923
    if (self._deactivated)                                                                                  // 924
      return;                                                                                               // 925
    id = self._idFilter.idStringify(id);                                                                    // 926
    self._session.changed(self._subscriptionHandle, collectionName, id, fields);                            // 927
  },                                                                                                        // 928
                                                                                                            // 929
  removed: function (collectionName, id) {                                                                  // 930
    var self = this;                                                                                        // 931
    if (self._deactivated)                                                                                  // 932
      return;                                                                                               // 933
    id = self._idFilter.idStringify(id);                                                                    // 934
    // We don't bother to delete sets of things in a collection if the                                      // 935
    // collection is empty.  It could break _removeAllDocuments.                                            // 936
    delete self._documents[collectionName][id];                                                             // 937
    self._session.removed(self._subscriptionHandle, collectionName, id);                                    // 938
  },                                                                                                        // 939
                                                                                                            // 940
  ready: function () {                                                                                      // 941
    var self = this;                                                                                        // 942
    if (self._deactivated)                                                                                  // 943
      return;                                                                                               // 944
    if (!self._subscriptionId)                                                                              // 945
      return;  // unnecessary but ignored for universal sub                                                 // 946
    if (!self._ready) {                                                                                     // 947
      self._session.sendReady([self._subscriptionId]);                                                      // 948
      self._ready = true;                                                                                   // 949
    }                                                                                                       // 950
  }                                                                                                         // 951
});                                                                                                         // 952
                                                                                                            // 953
/******************************************************************************/                            // 954
/* Server                                                                     */                            // 955
/******************************************************************************/                            // 956
                                                                                                            // 957
Server = function () {                                                                                      // 958
  var self = this;                                                                                          // 959
                                                                                                            // 960
  self.publish_handlers = {};                                                                               // 961
  self.universal_publish_handlers = [];                                                                     // 962
                                                                                                            // 963
  self.method_handlers = {};                                                                                // 964
                                                                                                            // 965
  self.sessions = {}; // map from id to session                                                             // 966
                                                                                                            // 967
  // Keeps track of the open connections associated with particular login                                   // 968
  // tokens. Used for logging out all a user's open connections, expiring login                             // 969
  // tokens, etc.                                                                                           // 970
  // XXX This mixes accounts concerns (login tokens) into livedata, which is not                            // 971
  // ideal. Eventually we'll have an API that allows accounts to keep track of                              // 972
  // which connections are associated with tokens and close them when necessary,                            // 973
  // rather than the current state of things where accounts tells livedata which                            // 974
  // connections are associated with which tokens, and when to close connections                            // 975
  // associated with a given token.                                                                         // 976
  self.sessionsByLoginToken = {};                                                                           // 977
                                                                                                            // 978
                                                                                                            // 979
  self.stream_server = new StreamServer;                                                                    // 980
                                                                                                            // 981
  self.stream_server.register(function (socket) {                                                           // 982
    // socket implements the SockJSConnection interface                                                     // 983
    socket._meteorSession = null;                                                                           // 984
                                                                                                            // 985
    var sendError = function (reason, offendingMessage) {                                                   // 986
      var msg = {msg: 'error', reason: reason};                                                             // 987
      if (offendingMessage)                                                                                 // 988
        msg.offendingMessage = offendingMessage;                                                            // 989
      socket.send(stringifyDDP(msg));                                                                       // 990
    };                                                                                                      // 991
                                                                                                            // 992
    socket.on('data', function (raw_msg) {                                                                  // 993
      if (Meteor._printReceivedDDP) {                                                                       // 994
        Meteor._debug("Received DDP", raw_msg);                                                             // 995
      }                                                                                                     // 996
      try {                                                                                                 // 997
        try {                                                                                               // 998
          var msg = parseDDP(raw_msg);                                                                      // 999
        } catch (err) {                                                                                     // 1000
          sendError('Parse error');                                                                         // 1001
          return;                                                                                           // 1002
        }                                                                                                   // 1003
        if (msg === null || !msg.msg) {                                                                     // 1004
          sendError('Bad request', msg);                                                                    // 1005
          return;                                                                                           // 1006
        }                                                                                                   // 1007
                                                                                                            // 1008
        if (msg.msg === 'connect') {                                                                        // 1009
          if (socket._meteorSession) {                                                                      // 1010
            sendError("Already connected", msg);                                                            // 1011
            return;                                                                                         // 1012
          }                                                                                                 // 1013
          self._handleConnect(socket, msg);                                                                 // 1014
          return;                                                                                           // 1015
        }                                                                                                   // 1016
                                                                                                            // 1017
        if (!socket._meteorSession) {                                                                       // 1018
          sendError('Must connect first', msg);                                                             // 1019
          return;                                                                                           // 1020
        }                                                                                                   // 1021
        socket._meteorSession.processMessage(msg);                                                          // 1022
      } catch (e) {                                                                                         // 1023
        // XXX print stack nicely                                                                           // 1024
        Meteor._debug("Internal exception while processing message", msg,                                   // 1025
                      e.message, e.stack);                                                                  // 1026
      }                                                                                                     // 1027
    });                                                                                                     // 1028
                                                                                                            // 1029
    socket.on('close', function () {                                                                        // 1030
      if (socket._meteorSession) {                                                                          // 1031
        Fiber(function () {                                                                                 // 1032
          self._destroySession(socket._meteorSession);                                                      // 1033
        }).run();                                                                                           // 1034
      }                                                                                                     // 1035
    });                                                                                                     // 1036
  });                                                                                                       // 1037
};                                                                                                          // 1038
                                                                                                            // 1039
_.extend(Server.prototype, {                                                                                // 1040
                                                                                                            // 1041
  _handleConnect: function (socket, msg) {                                                                  // 1042
    var self = this;                                                                                        // 1043
    // In the future, handle session resumption: something like:                                            // 1044
    //  socket._meteorSession = self.sessions[msg.session]                                                  // 1045
    var version = calculateVersion(msg.support, SUPPORTED_DDP_VERSIONS);                                    // 1046
                                                                                                            // 1047
    if (msg.version === version) {                                                                          // 1048
      // Creating a new session                                                                             // 1049
      socket._meteorSession = new Session(self, version, socket);                                           // 1050
      self.sessions[socket._meteorSession.id] = socket._meteorSession;                                      // 1051
    } else if (!msg.version) {                                                                              // 1052
      // connect message without a version. This means an old (pre-pre1)                                    // 1053
      // client is trying to connect. If we just disconnect the                                             // 1054
      // connection, they'll retry right away. Instead, just pause for a                                    // 1055
      // bit (randomly distributed so as to avoid synchronized swarms)                                      // 1056
      // and hold the connection open.                                                                      // 1057
      var timeout = 1000 * (30 + Random.fraction() * 60);                                                   // 1058
      // drop all future data coming over this connection on the                                            // 1059
      // floor. We don't want to confuse things.                                                            // 1060
      socket.removeAllListeners('data');                                                                    // 1061
      setTimeout(function () {                                                                              // 1062
        socket.send(stringifyDDP({msg: 'failed', version: version}));                                       // 1063
        socket.close();                                                                                     // 1064
      }, timeout);                                                                                          // 1065
    } else {                                                                                                // 1066
      socket.send(stringifyDDP({msg: 'failed', version: version}));                                         // 1067
      socket.close();                                                                                       // 1068
    }                                                                                                       // 1069
  },                                                                                                        // 1070
  /**                                                                                                       // 1071
   * Register a publish handler function.                                                                   // 1072
   *                                                                                                        // 1073
   * @param name {String} identifier for query                                                              // 1074
   * @param handler {Function} publish handler                                                              // 1075
   * @param options {Object}                                                                                // 1076
   *                                                                                                        // 1077
   * Server will call handler function on each new subscription,                                            // 1078
   * either when receiving DDP sub message for a named subscription, or on                                  // 1079
   * DDP connect for a universal subscription.                                                              // 1080
   *                                                                                                        // 1081
   * If name is null, this will be a subscription that is                                                   // 1082
   * automatically established and permanently on for all connected                                         // 1083
   * client, instead of a subscription that can be turned on and off                                        // 1084
   * with subscribe().                                                                                      // 1085
   *                                                                                                        // 1086
   * options to contain:                                                                                    // 1087
   *  - (mostly internal) is_auto: true if generated automatically                                          // 1088
   *    from an autopublish hook. this is for cosmetic purposes only                                        // 1089
   *    (it lets us determine whether to print a warning suggesting                                         // 1090
   *    that you turn off autopublish.)                                                                     // 1091
   */                                                                                                       // 1092
  publish: function (name, handler, options) {                                                              // 1093
    var self = this;                                                                                        // 1094
                                                                                                            // 1095
    options = options || {};                                                                                // 1096
                                                                                                            // 1097
    if (name && name in self.publish_handlers) {                                                            // 1098
      Meteor._debug("Ignoring duplicate publish named '" + name + "'");                                     // 1099
      return;                                                                                               // 1100
    }                                                                                                       // 1101
                                                                                                            // 1102
    if (Package.autopublish && !options.is_auto) {                                                          // 1103
      // They have autopublish on, yet they're trying to manually                                           // 1104
      // picking stuff to publish. They probably should turn off                                            // 1105
      // autopublish. (This check isn't perfect -- if you create a                                          // 1106
      // publish before you turn on autopublish, it won't catch                                             // 1107
      // it. But this will definitely handle the simple case where                                          // 1108
      // you've added the autopublish package to your app, and are                                          // 1109
      // calling publish from your app code.)                                                               // 1110
      if (!self.warned_about_autopublish) {                                                                 // 1111
        self.warned_about_autopublish = true;                                                               // 1112
        Meteor._debug(                                                                                      // 1113
"** You've set up some data subscriptions with Meteor.publish(), but\n" +                                   // 1114
"** you still have autopublish turned on. Because autopublish is still\n" +                                 // 1115
"** on, your Meteor.publish() calls won't have much effect. All data\n" +                                   // 1116
"** will still be sent to all clients.\n" +                                                                 // 1117
"**\n" +                                                                                                    // 1118
"** Turn off autopublish by removing the autopublish package:\n" +                                          // 1119
"**\n" +                                                                                                    // 1120
"**   $ meteor remove autopublish\n" +                                                                      // 1121
"**\n" +                                                                                                    // 1122
"** .. and make sure you have Meteor.publish() and Meteor.subscribe() calls\n" +                            // 1123
"** for each collection that you want clients to see.\n");                                                  // 1124
      }                                                                                                     // 1125
    }                                                                                                       // 1126
                                                                                                            // 1127
    if (name)                                                                                               // 1128
      self.publish_handlers[name] = handler;                                                                // 1129
    else {                                                                                                  // 1130
      self.universal_publish_handlers.push(handler);                                                        // 1131
      // Spin up the new publisher on any existing session too. Run each                                    // 1132
      // session's subscription in a new Fiber, so that there's no change for                               // 1133
      // self.sessions to change while we're running this loop.                                             // 1134
      _.each(self.sessions, function (session) {                                                            // 1135
        if (!session._dontStartNewUniversalSubs) {                                                          // 1136
          Fiber(function() {                                                                                // 1137
            session._startSubscription(handler);                                                            // 1138
          }).run();                                                                                         // 1139
        }                                                                                                   // 1140
      });                                                                                                   // 1141
    }                                                                                                       // 1142
  },                                                                                                        // 1143
                                                                                                            // 1144
  _destroySession: function (session) {                                                                     // 1145
    var self = this;                                                                                        // 1146
    delete self.sessions[session.id];                                                                       // 1147
    if (session.sessionData.loginToken) {                                                                   // 1148
      self.sessionsByLoginToken[session.sessionData.loginToken] = _.without(                                // 1149
        self.sessionsByLoginToken[session.sessionData.loginToken],                                          // 1150
        session.id                                                                                          // 1151
      );                                                                                                    // 1152
      if (_.isEmpty(self.sessionsByLoginToken[session.sessionData.loginToken])) {                           // 1153
        delete self.sessionsByLoginToken[session.sessionData.loginToken];                                   // 1154
      }                                                                                                     // 1155
    }                                                                                                       // 1156
    session.destroy();                                                                                      // 1157
  },                                                                                                        // 1158
                                                                                                            // 1159
  methods: function (methods) {                                                                             // 1160
    var self = this;                                                                                        // 1161
    _.each(methods, function (func, name) {                                                                 // 1162
      if (self.method_handlers[name])                                                                       // 1163
        throw new Error("A method named '" + name + "' is already defined");                                // 1164
      self.method_handlers[name] = func;                                                                    // 1165
    });                                                                                                     // 1166
  },                                                                                                        // 1167
                                                                                                            // 1168
  call: function (name /*, arguments */) {                                                                  // 1169
    // if it's a function, the last argument is the result callback,                                        // 1170
    // not a parameter to the remote method.                                                                // 1171
    var args = Array.prototype.slice.call(arguments, 1);                                                    // 1172
    if (args.length && typeof args[args.length - 1] === "function")                                         // 1173
      var callback = args.pop();                                                                            // 1174
    return this.apply(name, args, callback);                                                                // 1175
  },                                                                                                        // 1176
                                                                                                            // 1177
  // @param options {Optional Object}                                                                       // 1178
  // @param callback {Optional Function}                                                                    // 1179
  apply: function (name, args, options, callback) {                                                         // 1180
    var self = this;                                                                                        // 1181
                                                                                                            // 1182
    // We were passed 3 arguments. They may be either (name, args, options)                                 // 1183
    // or (name, args, callback)                                                                            // 1184
    if (!callback && typeof options === 'function') {                                                       // 1185
      callback = options;                                                                                   // 1186
      options = {};                                                                                         // 1187
    }                                                                                                       // 1188
    options = options || {};                                                                                // 1189
                                                                                                            // 1190
    if (callback)                                                                                           // 1191
      // It's not really necessary to do this, since we immediately                                         // 1192
      // run the callback in this fiber before returning, but we do it                                      // 1193
      // anyway for regularity.                                                                             // 1194
      callback = Meteor.bindEnvironment(callback, function (e) {                                            // 1195
        // XXX improve error message (and how we report it)                                                 // 1196
        Meteor._debug("Exception while delivering result of invoking '" +                                   // 1197
                      name + "'", e.stack);                                                                 // 1198
      });                                                                                                   // 1199
                                                                                                            // 1200
    // Run the handler                                                                                      // 1201
    var handler = self.method_handlers[name];                                                               // 1202
    var exception;                                                                                          // 1203
    if (!handler) {                                                                                         // 1204
      exception = new Meteor.Error(404, "Method not found");                                                // 1205
    } else {                                                                                                // 1206
      // If this is a method call from within another method, get the                                       // 1207
      // user state from the outer method, otherwise don't allow                                            // 1208
      // setUserId to be called                                                                             // 1209
      var userId = null;                                                                                    // 1210
      var setUserId = function() {                                                                          // 1211
        throw new Error("Can't call setUserId on a server initiated method call");                          // 1212
      };                                                                                                    // 1213
      var setLoginToken = function () {                                                                     // 1214
        // XXX is this correct?                                                                             // 1215
        throw new Error("Can't call _setLoginToken on a server " +                                          // 1216
                        "initiated method call");                                                           // 1217
      };                                                                                                    // 1218
      var currentInvocation = DDP._CurrentInvocation.get();                                                 // 1219
      if (currentInvocation) {                                                                              // 1220
        userId = currentInvocation.userId;                                                                  // 1221
        setUserId = function(userId) {                                                                      // 1222
          currentInvocation.setUserId(userId);                                                              // 1223
        };                                                                                                  // 1224
        setLoginToken = function (newToken) {                                                               // 1225
          currentInvocation._setLoginToken(newToken);                                                       // 1226
        };                                                                                                  // 1227
      }                                                                                                     // 1228
                                                                                                            // 1229
      var invocation = new MethodInvocation({                                                               // 1230
        isSimulation: false,                                                                                // 1231
        userId: userId,                                                                                     // 1232
        setUserId: setUserId,                                                                               // 1233
        _setLoginToken: setLoginToken,                                                                      // 1234
        sessionData: self.sessionData                                                                       // 1235
      });                                                                                                   // 1236
      try {                                                                                                 // 1237
        var result = DDP._CurrentInvocation.withValue(invocation, function () {                             // 1238
          return maybeAuditArgumentChecks(                                                                  // 1239
            handler, invocation, args, "internal call to '" + name + "'");                                  // 1240
        });                                                                                                 // 1241
      } catch (e) {                                                                                         // 1242
        exception = e;                                                                                      // 1243
      }                                                                                                     // 1244
    }                                                                                                       // 1245
                                                                                                            // 1246
    // Return the result in whichever way the caller asked for it. Note that we                             // 1247
    // do NOT block on the write fence in an analogous way to how the client                                // 1248
    // blocks on the relevant data being visible, so you are NOT guaranteed that                            // 1249
    // cursor observe callbacks have fired when your callback is invoked. (We                               // 1250
    // can change this if there's a real use case.)                                                         // 1251
    if (callback) {                                                                                         // 1252
      callback(exception, result);                                                                          // 1253
      return undefined;                                                                                     // 1254
    }                                                                                                       // 1255
    if (exception)                                                                                          // 1256
      throw exception;                                                                                      // 1257
    return result;                                                                                          // 1258
  },                                                                                                        // 1259
                                                                                                            // 1260
  _loginTokenChanged: function (session, newToken, oldToken) {                                              // 1261
    var self = this;                                                                                        // 1262
    if (oldToken) {                                                                                         // 1263
      // Remove the session from the list of open sessions for the old token.                               // 1264
      self.sessionsByLoginToken[oldToken] = _.without(                                                      // 1265
        self.sessionsByLoginToken[oldToken],                                                                // 1266
        session.id                                                                                          // 1267
      );                                                                                                    // 1268
      if (_.isEmpty(self.sessionsByLoginToken[oldToken]))                                                   // 1269
        delete self.sessionsByLoginToken[oldToken];                                                         // 1270
    }                                                                                                       // 1271
    if (newToken) {                                                                                         // 1272
      if (! _.has(self.sessionsByLoginToken, newToken))                                                     // 1273
        self.sessionsByLoginToken[newToken] = [];                                                           // 1274
      self.sessionsByLoginToken[newToken].push(session.id);                                                 // 1275
    }                                                                                                       // 1276
  },                                                                                                        // 1277
                                                                                                            // 1278
  // Close all open sessions associated with any of the tokens in                                           // 1279
  // `tokens`.                                                                                              // 1280
  _closeAllForTokens: function (tokens) {                                                                   // 1281
    var self = this;                                                                                        // 1282
    _.each(tokens, function (token) {                                                                       // 1283
      if (_.has(self.sessionsByLoginToken, token)) {                                                        // 1284
        // _destroySession modifies sessionsByLoginToken, so we clone it.                                   // 1285
        _.each(EJSON.clone(self.sessionsByLoginToken[token]), function (sessionId) {                        // 1286
          // Destroy session and remove from self.sessions.                                                 // 1287
          var session = self.sessions[sessionId];                                                           // 1288
          if (session) {                                                                                    // 1289
            self._destroySession(session);                                                                  // 1290
          }                                                                                                 // 1291
        });                                                                                                 // 1292
      }                                                                                                     // 1293
    });                                                                                                     // 1294
  }                                                                                                         // 1295
});                                                                                                         // 1296
                                                                                                            // 1297
var calculateVersion = function (clientSupportedVersions,                                                   // 1298
                                 serverSupportedVersions) {                                                 // 1299
  var correctVersion = _.find(clientSupportedVersions, function (version) {                                 // 1300
    return _.contains(serverSupportedVersions, version);                                                    // 1301
  });                                                                                                       // 1302
  if (!correctVersion) {                                                                                    // 1303
    correctVersion = serverSupportedVersions[0];                                                            // 1304
  }                                                                                                         // 1305
  return correctVersion;                                                                                    // 1306
};                                                                                                          // 1307
                                                                                                            // 1308
LivedataTest.calculateVersion = calculateVersion;                                                           // 1309
                                                                                                            // 1310
                                                                                                            // 1311
// "blind" exceptions other than those that were deliberately thrown to signal                              // 1312
// errors to the client                                                                                     // 1313
var wrapInternalException = function (exception, context) {                                                 // 1314
  if (!exception || exception instanceof Meteor.Error)                                                      // 1315
    return exception;                                                                                       // 1316
                                                                                                            // 1317
  // Did the error contain more details that could have been useful if caught in                            // 1318
  // server code (or if thrown from non-client-originated code), but also                                   // 1319
  // provided a "sanitized" version with more context than 500 Internal server                              // 1320
  // error? Use that.                                                                                       // 1321
  if (exception.sanitizedError) {                                                                           // 1322
    if (exception.sanitizedError instanceof Meteor.Error)                                                   // 1323
      return exception.sanitizedError;                                                                      // 1324
    Meteor._debug("Exception " + context + " provides a sanitizedError that " +                             // 1325
                  "is not a Meteor.Error; ignoring");                                                       // 1326
  }                                                                                                         // 1327
                                                                                                            // 1328
  // tests can set the 'expected' flag on an exception so it won't go to the                                // 1329
  // server log                                                                                             // 1330
  if (!exception.expected)                                                                                  // 1331
    Meteor._debug("Exception " + context, exception.stack);                                                 // 1332
                                                                                                            // 1333
  return new Meteor.Error(500, "Internal server error");                                                    // 1334
};                                                                                                          // 1335
                                                                                                            // 1336
                                                                                                            // 1337
// Audit argument checks, if the audit-argument-checks package exists (it is a                              // 1338
// weak dependency of this package).                                                                        // 1339
var maybeAuditArgumentChecks = function (f, context, args, description) {                                   // 1340
  args = args || [];                                                                                        // 1341
  if (Package['audit-argument-checks']) {                                                                   // 1342
    return Match._failIfArgumentsAreNotAllChecked(                                                          // 1343
      f, context, args, description);                                                                       // 1344
  }                                                                                                         // 1345
  return f.apply(context, args);                                                                            // 1346
};                                                                                                          // 1347
                                                                                                            // 1348
//////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

//////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                          //
// packages/livedata/writefence.js                                                                          //
//                                                                                                          //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                            //
var path = Npm.require('path');                                                                             // 1
var Future = Npm.require(path.join('fibers', 'future'));                                                    // 2
                                                                                                            // 3
// A write fence collects a group of writes, and provides a callback                                        // 4
// when all of the writes are fully committed and propagated (all                                           // 5
// observers have been notified of the write and acknowledged it.)                                          // 6
//                                                                                                          // 7
DDPServer._WriteFence = function () {                                                                       // 8
  var self = this;                                                                                          // 9
                                                                                                            // 10
  self.armed = false;                                                                                       // 11
  self.fired = false;                                                                                       // 12
  self.retired = false;                                                                                     // 13
  self.outstanding_writes = 0;                                                                              // 14
  self.completion_callbacks = [];                                                                           // 15
};                                                                                                          // 16
                                                                                                            // 17
// The current write fence. When there is a current write fence, code                                       // 18
// that writes to databases should register their writes with it using                                      // 19
// beginWrite().                                                                                            // 20
//                                                                                                          // 21
DDPServer._CurrentWriteFence = new Meteor.EnvironmentVariable;                                              // 22
                                                                                                            // 23
_.extend(DDPServer._WriteFence.prototype, {                                                                 // 24
  // Start tracking a write, and return an object to represent it. The                                      // 25
  // object has a single method, committed(). This method should be                                         // 26
  // called when the write is fully committed and propagated. You can                                       // 27
  // continue to add writes to the WriteFence up until it is triggered                                      // 28
  // (calls its callbacks because all writes have committed.)                                               // 29
  beginWrite: function () {                                                                                 // 30
    var self = this;                                                                                        // 31
                                                                                                            // 32
    if (self.retired)                                                                                       // 33
      return { committed: function () {} };                                                                 // 34
                                                                                                            // 35
    if (self.fired)                                                                                         // 36
      throw new Error("fence has already activated -- too late to add writes");                             // 37
                                                                                                            // 38
    self.outstanding_writes++;                                                                              // 39
    var committed = false;                                                                                  // 40
    return {                                                                                                // 41
      committed: function () {                                                                              // 42
        if (committed)                                                                                      // 43
          throw new Error("committed called twice on the same write");                                      // 44
        committed = true;                                                                                   // 45
        self.outstanding_writes--;                                                                          // 46
        self._maybeFire();                                                                                  // 47
      }                                                                                                     // 48
    };                                                                                                      // 49
  },                                                                                                        // 50
                                                                                                            // 51
  // Arm the fence. Once the fence is armed, and there are no more                                          // 52
  // uncommitted writes, it will activate.                                                                  // 53
  arm: function () {                                                                                        // 54
    var self = this;                                                                                        // 55
    self.armed = true;                                                                                      // 56
    self._maybeFire();                                                                                      // 57
  },                                                                                                        // 58
                                                                                                            // 59
  // Register a function to be called when the fence fires.                                                 // 60
  onAllCommitted: function (func) {                                                                         // 61
    var self = this;                                                                                        // 62
    if (self.fired)                                                                                         // 63
      throw new Error("fence has already activated -- too late to " +                                       // 64
                      "add a callback");                                                                    // 65
    self.completion_callbacks.push(func);                                                                   // 66
  },                                                                                                        // 67
                                                                                                            // 68
  // Convenience function. Arms the fence, then blocks until it fires.                                      // 69
  armAndWait: function () {                                                                                 // 70
    var self = this;                                                                                        // 71
    var future = new Future;                                                                                // 72
    self.onAllCommitted(function () {                                                                       // 73
      future['return']();                                                                                   // 74
    });                                                                                                     // 75
    self.arm();                                                                                             // 76
    future.wait();                                                                                          // 77
  },                                                                                                        // 78
                                                                                                            // 79
  _maybeFire: function () {                                                                                 // 80
    var self = this;                                                                                        // 81
    if (self.fired)                                                                                         // 82
      throw new Error("write fence already activated?");                                                    // 83
    if (self.armed && !self.outstanding_writes) {                                                           // 84
      self.fired = true;                                                                                    // 85
      _.each(self.completion_callbacks, function (f) {f(self);});                                           // 86
      self.completion_callbacks = [];                                                                       // 87
    }                                                                                                       // 88
  },                                                                                                        // 89
                                                                                                            // 90
  // Deactivate this fence so that adding more writes has no effect.                                        // 91
  // The fence must have already fired.                                                                     // 92
  retire: function () {                                                                                     // 93
    var self = this;                                                                                        // 94
    if (! self.fired)                                                                                       // 95
      throw new Error("Can't retire a fence that hasn't fired.");                                           // 96
    self.retired = true;                                                                                    // 97
  }                                                                                                         // 98
});                                                                                                         // 99
                                                                                                            // 100
//////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

//////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                          //
// packages/livedata/crossbar.js                                                                            //
//                                                                                                          //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                            //
DDPServer._InvalidationCrossbar = function () {                                                             // 1
  var self = this;                                                                                          // 2
                                                                                                            // 3
  self.next_id = 1;                                                                                         // 4
  // map from listener id to object. each object has keys 'trigger',                                        // 5
  // 'callback'.                                                                                            // 6
  self.listeners = {};                                                                                      // 7
};                                                                                                          // 8
                                                                                                            // 9
_.extend(DDPServer._InvalidationCrossbar.prototype, {                                                       // 10
  // Listen for notification that match 'trigger'. A notification                                           // 11
  // matches if it has the key-value pairs in trigger as a                                                  // 12
  // subset. When a notification matches, call 'callback', passing two                                      // 13
  // arguments, the actual notification and an acknowledgement                                              // 14
  // function. The callback should call the acknowledgement function                                        // 15
  // when it is finished processing the notification.                                                       // 16
  //                                                                                                        // 17
  // Returns a listen handle, which is an object with a method                                              // 18
  // stop(). Call stop() to stop listening.                                                                 // 19
  //                                                                                                        // 20
  // XXX It should be legal to call fire() from inside a listen()                                           // 21
  // callback?                                                                                              // 22
  //                                                                                                        // 23
  // Note: the LiveResultsSet constructor assumes that a call to listen() never                             // 24
  // yields.                                                                                                // 25
  listen: function (trigger, callback) {                                                                    // 26
    var self = this;                                                                                        // 27
    var id = self.next_id++;                                                                                // 28
    self.listeners[id] = {trigger: EJSON.clone(trigger), callback: callback};                               // 29
    return {                                                                                                // 30
      stop: function () {                                                                                   // 31
        delete self.listeners[id];                                                                          // 32
      }                                                                                                     // 33
    };                                                                                                      // 34
  },                                                                                                        // 35
                                                                                                            // 36
  // Fire the provided 'notification' (an object whose attribute                                            // 37
  // values are all JSON-compatibile) -- inform all matching listeners                                      // 38
  // (registered with listen()), and once they have all acknowledged                                        // 39
  // the notification, call onComplete with no arguments.                                                   // 40
  //                                                                                                        // 41
  // If fire() is called inside a write fence, then each of the                                             // 42
  // listener callbacks will be called inside the write fence as well.                                      // 43
  //                                                                                                        // 44
  // The listeners may be invoked in parallel, rather than serially.                                        // 45
  fire: function (notification, onComplete) {                                                               // 46
    var self = this;                                                                                        // 47
    var callbacks = [];                                                                                     // 48
    _.each(self.listeners, function (l) {                                                                   // 49
      if (self._matches(notification, l.trigger))                                                           // 50
        callbacks.push(l.callback);                                                                         // 51
    });                                                                                                     // 52
                                                                                                            // 53
    if (onComplete)                                                                                         // 54
      onComplete = Meteor.bindEnvironment(onComplete, function (e) {                                        // 55
        Meteor._debug("Exception in InvalidationCrossbar fire complete " +                                  // 56
                      "callback", e.stack);                                                                 // 57
      });                                                                                                   // 58
                                                                                                            // 59
    var outstanding = callbacks.length;                                                                     // 60
    if (!outstanding)                                                                                       // 61
      onComplete && onComplete();                                                                           // 62
    else {                                                                                                  // 63
      _.each(callbacks, function (c) {                                                                      // 64
        c(notification, function () {                                                                       // 65
          if (--outstanding === 0)                                                                          // 66
            onComplete && onComplete();                                                                     // 67
        });                                                                                                 // 68
      });                                                                                                   // 69
    }                                                                                                       // 70
  },                                                                                                        // 71
                                                                                                            // 72
  // A notification matches a trigger if all keys that exist in both are equal.                             // 73
  //                                                                                                        // 74
  // Examples:                                                                                              // 75
  //  N:{collection: "C"} matches T:{collection: "C"}                                                       // 76
  //    (a non-targeted write to a collection matches a                                                     // 77
  //     non-targeted query)                                                                                // 78
  //  N:{collection: "C", id: "X"} matches T:{collection: "C"}                                              // 79
  //    (a targeted write to a collection matches a non-targeted query)                                     // 80
  //  N:{collection: "C"} matches T:{collection: "C", id: "X"}                                              // 81
  //    (a non-targeted write to a collection matches a                                                     // 82
  //     targeted query)                                                                                    // 83
  //  N:{collection: "C", id: "X"} matches T:{collection: "C", id: "X"}                                     // 84
  //    (a targeted write to a collection matches a targeted query targeted                                 // 85
  //     at the same document)                                                                              // 86
  //  N:{collection: "C", id: "X"} does not match T:{collection: "C", id: "Y"}                              // 87
  //    (a targeted write to a collection does not match a targeted query                                   // 88
  //     targeted at a different document)                                                                  // 89
  _matches: function (notification, trigger) {                                                              // 90
    return _.all(trigger, function (triggerValue, key) {                                                    // 91
      return !_.has(notification, key) ||                                                                   // 92
        EJSON.equals(triggerValue, notification[key]);                                                      // 93
    });                                                                                                     // 94
  }                                                                                                         // 95
});                                                                                                         // 96
                                                                                                            // 97
// singleton                                                                                                // 98
DDPServer._InvalidationCrossbar = new DDPServer._InvalidationCrossbar;                                      // 99
                                                                                                            // 100
//////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

//////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                          //
// packages/livedata/livedata_common.js                                                                     //
//                                                                                                          //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                            //
DDP = {};                                                                                                   // 1
                                                                                                            // 2
SUPPORTED_DDP_VERSIONS = [ 'pre1' ];                                                                        // 3
                                                                                                            // 4
LivedataTest.SUPPORTED_DDP_VERSIONS = SUPPORTED_DDP_VERSIONS;                                               // 5
                                                                                                            // 6
MethodInvocation = function (options) {                                                                     // 7
  var self = this;                                                                                          // 8
                                                                                                            // 9
  // true if we're running not the actual method, but a stub (that is,                                      // 10
  // if we're on a client (which may be a browser, or in the future a                                       // 11
  // server connecting to another server) and presently running a                                           // 12
  // simulation of a server-side method for latency compensation                                            // 13
  // purposes). not currently true except in a client such as a browser,                                    // 14
  // since there's usually no point in running stubs unless you have a                                      // 15
  // zero-latency connection to the user.                                                                   // 16
  this.isSimulation = options.isSimulation;                                                                 // 17
                                                                                                            // 18
  // call this function to allow other method invocations (from the                                         // 19
  // same client) to continue running without waiting for this one to                                       // 20
  // complete.                                                                                              // 21
  this._unblock = options.unblock || function () {};                                                        // 22
  this._calledUnblock = false;                                                                              // 23
                                                                                                            // 24
  // current user id                                                                                        // 25
  this.userId = options.userId;                                                                             // 26
                                                                                                            // 27
  // sets current user id in all appropriate server contexts and                                            // 28
  // reruns subscriptions                                                                                   // 29
  this._setUserId = options.setUserId || function () {};                                                    // 30
                                                                                                            // 31
  // used for associating the connection with a login token so that the                                     // 32
  // connection can be closed if the token is no longer valid                                               // 33
  this._setLoginToken = options._setLoginToken || function () {};                                           // 34
                                                                                                            // 35
  // Scratch data scoped to this connection (livedata_connection on the                                     // 36
  // client, livedata_session on the server). This is only used                                             // 37
  // internally, but we should have real and documented API for this                                        // 38
  // sort of thing someday.                                                                                 // 39
  this._sessionData = options.sessionData;                                                                  // 40
};                                                                                                          // 41
                                                                                                            // 42
_.extend(MethodInvocation.prototype, {                                                                      // 43
  unblock: function () {                                                                                    // 44
    var self = this;                                                                                        // 45
    self._calledUnblock = true;                                                                             // 46
    self._unblock();                                                                                        // 47
  },                                                                                                        // 48
  setUserId: function(userId) {                                                                             // 49
    var self = this;                                                                                        // 50
    if (self._calledUnblock)                                                                                // 51
      throw new Error("Can't call setUserId in a method after calling unblock");                            // 52
    self.userId = userId;                                                                                   // 53
    self._setUserId(userId);                                                                                // 54
  },                                                                                                        // 55
  _setLoginToken: function (token) {                                                                        // 56
    this._setLoginToken(token);                                                                             // 57
    this._sessionData.loginToken = token;                                                                   // 58
  },                                                                                                        // 59
  _getLoginToken: function (token) {                                                                        // 60
    return this._sessionData.loginToken;                                                                    // 61
  }                                                                                                         // 62
});                                                                                                         // 63
                                                                                                            // 64
parseDDP = function (stringMessage) {                                                                       // 65
  try {                                                                                                     // 66
    var msg = JSON.parse(stringMessage);                                                                    // 67
  } catch (e) {                                                                                             // 68
    Meteor._debug("Discarding message with invalid JSON", stringMessage);                                   // 69
    return null;                                                                                            // 70
  }                                                                                                         // 71
  // DDP messages must be objects.                                                                          // 72
  if (msg === null || typeof msg !== 'object') {                                                            // 73
    Meteor._debug("Discarding non-object DDP message", stringMessage);                                      // 74
    return null;                                                                                            // 75
  }                                                                                                         // 76
                                                                                                            // 77
  // massage msg to get it into "abstract ddp" rather than "wire ddp" format.                               // 78
                                                                                                            // 79
  // switch between "cleared" rep of unsetting fields and "undefined"                                       // 80
  // rep of same                                                                                            // 81
  if (_.has(msg, 'cleared')) {                                                                              // 82
    if (!_.has(msg, 'fields'))                                                                              // 83
      msg.fields = {};                                                                                      // 84
    _.each(msg.cleared, function (clearKey) {                                                               // 85
      msg.fields[clearKey] = undefined;                                                                     // 86
    });                                                                                                     // 87
    delete msg.cleared;                                                                                     // 88
  }                                                                                                         // 89
                                                                                                            // 90
  _.each(['fields', 'params', 'result'], function (field) {                                                 // 91
    if (_.has(msg, field))                                                                                  // 92
      msg[field] = EJSON._adjustTypesFromJSONValue(msg[field]);                                             // 93
  });                                                                                                       // 94
                                                                                                            // 95
  return msg;                                                                                               // 96
};                                                                                                          // 97
                                                                                                            // 98
stringifyDDP = function (msg) {                                                                             // 99
  var copy = EJSON.clone(msg);                                                                              // 100
  // swizzle 'changed' messages from 'fields undefined' rep to 'fields                                      // 101
  // and cleared' rep                                                                                       // 102
  if (_.has(msg, 'fields')) {                                                                               // 103
    var cleared = [];                                                                                       // 104
    _.each(msg.fields, function (value, key) {                                                              // 105
      if (value === undefined) {                                                                            // 106
        cleared.push(key);                                                                                  // 107
        delete copy.fields[key];                                                                            // 108
      }                                                                                                     // 109
    });                                                                                                     // 110
    if (!_.isEmpty(cleared))                                                                                // 111
      copy.cleared = cleared;                                                                               // 112
    if (_.isEmpty(copy.fields))                                                                             // 113
      delete copy.fields;                                                                                   // 114
  }                                                                                                         // 115
  // adjust types to basic                                                                                  // 116
  _.each(['fields', 'params', 'result'], function (field) {                                                 // 117
    if (_.has(copy, field))                                                                                 // 118
      copy[field] = EJSON._adjustTypesToJSONValue(copy[field]);                                             // 119
  });                                                                                                       // 120
  if (msg.id && typeof msg.id !== 'string') {                                                               // 121
    throw new Error("Message id is not a string");                                                          // 122
  }                                                                                                         // 123
  return JSON.stringify(copy);                                                                              // 124
};                                                                                                          // 125
                                                                                                            // 126
// This is private but it's used in a few places. accounts-base uses                                        // 127
// it to get the current user. accounts-password uses it to stash SRP                                       // 128
// state in the DDP session. Meteor.setTimeout and friends clear                                            // 129
// it. We can probably find a better way to factor this.                                                    // 130
DDP._CurrentInvocation = new Meteor.EnvironmentVariable;                                                    // 131
                                                                                                            // 132
//////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

//////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                          //
// packages/livedata/livedata_connection.js                                                                 //
//                                                                                                          //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                            //
if (Meteor.isServer) {                                                                                      // 1
  var path = Npm.require('path');                                                                           // 2
  var Fiber = Npm.require('fibers');                                                                        // 3
  var Future = Npm.require(path.join('fibers', 'future'));                                                  // 4
}                                                                                                           // 5
                                                                                                            // 6
// @param url {String|Object} URL to Meteor app,                                                            // 7
//   or an object as a test hook (see code)                                                                 // 8
// Options:                                                                                                 // 9
//   reloadOnUpdate: should we try to reload when the server says                                           // 10
//                      there's new code available?                                                         // 11
//   reloadWithOutstanding: is it OK to reload if there are outstanding methods?                            // 12
var Connection = function (url, options) {                                                                  // 13
  var self = this;                                                                                          // 14
  options = _.extend({                                                                                      // 15
    reloadOnUpdate: false,                                                                                  // 16
    // The rest of these options are only for testing.                                                      // 17
    reloadWithOutstanding: false,                                                                           // 18
    supportedDDPVersions: SUPPORTED_DDP_VERSIONS,                                                           // 19
    onConnectionFailure: function (reason) {                                                                // 20
      Meteor._debug("Failed DDP connection: " + reason);                                                    // 21
    },                                                                                                      // 22
    onConnected: function () {}                                                                             // 23
  }, options);                                                                                              // 24
                                                                                                            // 25
  // If set, called when we reconnect, queuing method calls _before_ the                                    // 26
  // existing outstanding ones. This is the only data member that is part of the                            // 27
  // public API!                                                                                            // 28
  self.onReconnect = null;                                                                                  // 29
                                                                                                            // 30
  // as a test hook, allow passing a stream instead of a url.                                               // 31
  if (typeof url === "object") {                                                                            // 32
    self._stream = url;                                                                                     // 33
  } else {                                                                                                  // 34
    self._stream = new LivedataTest.ClientStream(url);                                                      // 35
  }                                                                                                         // 36
                                                                                                            // 37
  self._lastSessionId = null;                                                                               // 38
  self._versionSuggestion = null;  // The last proposed DDP version.                                        // 39
  self._version = null;   // The DDP version agreed on by client and server.                                // 40
  self._stores = {}; // name -> object with methods                                                         // 41
  self._methodHandlers = {}; // name -> func                                                                // 42
  self._nextMethodId = 1;                                                                                   // 43
  self._supportedDDPVersions = options.supportedDDPVersions;                                                // 44
                                                                                                            // 45
  // Tracks methods which the user has tried to call but which have not yet                                 // 46
  // called their user callback (ie, they are waiting on their result or for all                            // 47
  // of their writes to be written to the local cache). Map from method ID to                               // 48
  // MethodInvoker object.                                                                                  // 49
  self._methodInvokers = {};                                                                                // 50
                                                                                                            // 51
  // Tracks methods which the user has called but whose result messages have not                            // 52
  // arrived yet.                                                                                           // 53
  //                                                                                                        // 54
  // _outstandingMethodBlocks is an array of blocks of methods. Each block                                  // 55
  // represents a set of methods that can run at the same time. The first block                             // 56
  // represents the methods which are currently in flight; subsequent blocks                                // 57
  // must wait for previous blocks to be fully finished before they can be sent                             // 58
  // to the server.                                                                                         // 59
  //                                                                                                        // 60
  // Each block is an object with the following fields:                                                     // 61
  // - methods: a list of MethodInvoker objects                                                             // 62
  // - wait: a boolean; if true, this block had a single method invoked with                                // 63
  //         the "wait" option                                                                              // 64
  //                                                                                                        // 65
  // There will never be adjacent blocks with wait=false, because the only thing                            // 66
  // that makes methods need to be serialized is a wait method.                                             // 67
  //                                                                                                        // 68
  // Methods are removed from the first block when their "result" is                                        // 69
  // received. The entire first block is only removed when all of the in-flight                             // 70
  // methods have received their results (so the "methods" list is empty) *AND*                             // 71
  // all of the data written by those methods are visible in the local cache. So                            // 72
  // it is possible for the first block's methods list to be empty, if we are                               // 73
  // still waiting for some objects to quiesce.                                                             // 74
  //                                                                                                        // 75
  // Example:                                                                                               // 76
  //  _outstandingMethodBlocks = [                                                                          // 77
  //    {wait: false, methods: []},                                                                         // 78
  //    {wait: true, methods: [<MethodInvoker for 'login'>]},                                               // 79
  //    {wait: false, methods: [<MethodInvoker for 'foo'>,                                                  // 80
  //                            <MethodInvoker for 'bar'>]}]                                                // 81
  // This means that there were some methods which were sent to the server and                              // 82
  // which have returned their results, but some of the data written by                                     // 83
  // the methods may not be visible in the local cache. Once all that data is                               // 84
  // visible, we will send a 'login' method. Once the login method has returned                             // 85
  // and all the data is visible (including re-running subs if userId changes),                             // 86
  // we will send the 'foo' and 'bar' methods in parallel.                                                  // 87
  self._outstandingMethodBlocks = [];                                                                       // 88
                                                                                                            // 89
  // method ID -> array of objects with keys 'collection' and 'id', listing                                 // 90
  // documents written by a given method's stub. keys are associated with                                   // 91
  // methods whose stub wrote at least one document, and whose data-done message                            // 92
  // has not yet been received.                                                                             // 93
  self._documentsWrittenByStub = {};                                                                        // 94
  // collection -> id -> "server document" object. A "server document" has:                                 // 95
  // - "document": the version of the document according the                                                // 96
  //   server (ie, the snapshot before a stub wrote it, amended by any changes                              // 97
  //   received from the server)                                                                            // 98
  //   It is undefined if we think the document does not exist                                              // 99
  // - "writtenByStubs": a set of method IDs whose stubs wrote to the document                              // 100
  //   whose "data done" messages have not yet been processed                                               // 101
  self._serverDocuments = {};                                                                               // 102
                                                                                                            // 103
  // Array of callbacks to be called after the next update of the local                                     // 104
  // cache. Used for:                                                                                       // 105
  //  - Calling methodInvoker.dataVisible and sub ready callbacks after                                     // 106
  //    the relevant data is flushed.                                                                       // 107
  //  - Invoking the callbacks of "half-finished" methods after reconnect                                   // 108
  //    quiescence. Specifically, methods whose result was received over the old                            // 109
  //    connection (so we don't re-send it) but whose data had not been made                                // 110
  //    visible.                                                                                            // 111
  self._afterUpdateCallbacks = [];                                                                          // 112
                                                                                                            // 113
  // In two contexts, we buffer all incoming data messages and then process them                            // 114
  // all at once in a single update:                                                                        // 115
  //   - During reconnect, we buffer all data messages until all subs that had                              // 116
  //     been ready before reconnect are ready again, and all methods that are                              // 117
  //     active have returned their "data done message"; then                                               // 118
  //   - During the execution of a "wait" method, we buffer all data messages                               // 119
  //     until the wait method gets its "data done" message. (If the wait method                            // 120
  //     occurs during reconnect, it doesn't get any special handling.)                                     // 121
  // all data messages are processed in one update.                                                         // 122
  //                                                                                                        // 123
  // The following fields are used for this "quiescence" process.                                           // 124
                                                                                                            // 125
  // This buffers the messages that aren't being processed yet.                                             // 126
  self._messagesBufferedUntilQuiescence = [];                                                               // 127
  // Map from method ID -> true. Methods are removed from this when their                                   // 128
  // "data done" message is received, and we will not quiesce until it is                                   // 129
  // empty.                                                                                                 // 130
  self._methodsBlockingQuiescence = {};                                                                     // 131
  // map from sub ID -> true for subs that were ready (ie, called the sub                                   // 132
  // ready callback) before reconnect but haven't become ready again yet                                    // 133
  self._subsBeingRevived = {}; // map from sub._id -> true                                                  // 134
  // if true, the next data update should reset all stores. (set during                                     // 135
  // reconnect.)                                                                                            // 136
  self._resetStores = false;                                                                                // 137
                                                                                                            // 138
  // name -> array of updates for (yet to be created) collections                                           // 139
  self._updatesForUnknownStores = {};                                                                       // 140
  // if we're blocking a migration, the retry func                                                          // 141
  self._retryMigrate = null;                                                                                // 142
                                                                                                            // 143
  // metadata for subscriptions.  Map from sub ID to object with keys:                                      // 144
  //   - id                                                                                                 // 145
  //   - name                                                                                               // 146
  //   - params                                                                                             // 147
  //   - inactive (if true, will be cleaned up if not reused in re-run)                                     // 148
  //   - ready (has the 'ready' message been received?)                                                     // 149
  //   - readyCallback (an optional callback to call when ready)                                            // 150
  //   - errorCallback (an optional callback to call if the sub terminates with                             // 151
  //                    an error)                                                                           // 152
  self._subscriptions = {};                                                                                 // 153
                                                                                                            // 154
  // Per-connection scratch area. This is only used internally, but we                                      // 155
  // should have real and documented API for this sort of thing someday.                                    // 156
  self._sessionData = {};                                                                                   // 157
                                                                                                            // 158
  // Reactive userId.                                                                                       // 159
  self._userId = null;                                                                                      // 160
  self._userIdDeps = (typeof Deps !== "undefined") && new Deps.Dependency;                                  // 161
                                                                                                            // 162
  // Block auto-reload while we're waiting for method responses.                                            // 163
  if (Meteor.isClient && Package.reload && !options.reloadWithOutstanding) {                                // 164
    Reload._onMigrate(function (retry) {                                                                    // 165
      if (!self._readyToMigrate()) {                                                                        // 166
        if (self._retryMigrate)                                                                             // 167
          throw new Error("Two migrations in progress?");                                                   // 168
        self._retryMigrate = retry;                                                                         // 169
        return false;                                                                                       // 170
      } else {                                                                                              // 171
        return [true];                                                                                      // 172
      }                                                                                                     // 173
    });                                                                                                     // 174
  }                                                                                                         // 175
                                                                                                            // 176
  var onMessage = function (raw_msg) {                                                                      // 177
    try {                                                                                                   // 178
      var msg = parseDDP(raw_msg);                                                                          // 179
    } catch (e) {                                                                                           // 180
      Meteor._debug("Exception while parsing DDP", e);                                                      // 181
      return;                                                                                               // 182
    }                                                                                                       // 183
                                                                                                            // 184
    if (msg === null || !msg.msg) {                                                                         // 185
      Meteor._debug("discarding invalid livedata message", msg);                                            // 186
      return;                                                                                               // 187
    }                                                                                                       // 188
                                                                                                            // 189
    if (msg.msg === 'connected') {                                                                          // 190
      self._version = self._versionSuggestion;                                                              // 191
      options.onConnected();                                                                                // 192
      self._livedata_connected(msg);                                                                        // 193
    }                                                                                                       // 194
    else if (msg.msg == 'failed') {                                                                         // 195
      if (_.contains(self._supportedDDPVersions, msg.version)) {                                            // 196
        self._versionSuggestion = msg.version;                                                              // 197
        self._stream.reconnect({_force: true});                                                             // 198
      } else {                                                                                              // 199
        var error =                                                                                         // 200
              "Version negotiation failed; server requested version " + msg.version;                        // 201
        self._stream.disconnect({_permanent: true, _error: error});                                         // 202
        options.onConnectionFailure(error);                                                                 // 203
      }                                                                                                     // 204
    }                                                                                                       // 205
    else if (_.include(['added', 'changed', 'removed', 'ready', 'updated'], msg.msg))                       // 206
      self._livedata_data(msg);                                                                             // 207
    else if (msg.msg === 'nosub')                                                                           // 208
      self._livedata_nosub(msg);                                                                            // 209
    else if (msg.msg === 'result')                                                                          // 210
      self._livedata_result(msg);                                                                           // 211
    else if (msg.msg === 'error')                                                                           // 212
      self._livedata_error(msg);                                                                            // 213
    else                                                                                                    // 214
      Meteor._debug("discarding unknown livedata message type", msg);                                       // 215
  };                                                                                                        // 216
                                                                                                            // 217
  var onReset = function () {                                                                               // 218
    // Send a connect message at the beginning of the stream.                                               // 219
    // NOTE: reset is called even on the first connection, so this is                                       // 220
    // the only place we send this message.                                                                 // 221
    var msg = {msg: 'connect'};                                                                             // 222
    if (self._lastSessionId)                                                                                // 223
      msg.session = self._lastSessionId;                                                                    // 224
    msg.version = self._versionSuggestion || self._supportedDDPVersions[0];                                 // 225
    self._versionSuggestion = msg.version;                                                                  // 226
    msg.support = self._supportedDDPVersions;                                                               // 227
    self._send(msg);                                                                                        // 228
                                                                                                            // 229
    // Now, to minimize setup latency, go ahead and blast out all of                                        // 230
    // our pending methods ands subscriptions before we've even taken                                       // 231
    // the necessary RTT to know if we successfully reconnected. (1)                                        // 232
    // They're supposed to be idempotent; (2) even if we did                                                // 233
    // reconnect, we're not sure what messages might have gotten lost                                       // 234
    // (in either direction) since we were disconnected (TCP being                                          // 235
    // sloppy about that.)                                                                                  // 236
                                                                                                            // 237
    // If the current block of methods all got their results (but didn't all get                            // 238
    // their data visible), discard the empty block now.                                                    // 239
    if (! _.isEmpty(self._outstandingMethodBlocks) &&                                                       // 240
        _.isEmpty(self._outstandingMethodBlocks[0].methods)) {                                              // 241
      self._outstandingMethodBlocks.shift();                                                                // 242
    }                                                                                                       // 243
                                                                                                            // 244
    // Mark all messages as unsent, they have not yet been sent on this                                     // 245
    // connection.                                                                                          // 246
    _.each(self._methodInvokers, function (m) {                                                             // 247
      m.sentMessage = false;                                                                                // 248
    });                                                                                                     // 249
                                                                                                            // 250
    // If an `onReconnect` handler is set, call it first. Go through                                        // 251
    // some hoops to ensure that methods that are called from within                                        // 252
    // `onReconnect` get executed _before_ ones that were originally                                        // 253
    // outstanding (since `onReconnect` is used to re-establish auth                                        // 254
    // certificates)                                                                                        // 255
    if (self.onReconnect)                                                                                   // 256
      self._callOnReconnectAndSendAppropriateOutstandingMethods();                                          // 257
    else                                                                                                    // 258
      self._sendOutstandingMethods();                                                                       // 259
                                                                                                            // 260
    // add new subscriptions at the end. this way they take effect after                                    // 261
    // the handlers and we don't see flicker.                                                               // 262
    _.each(self._subscriptions, function (sub, id) {                                                        // 263
      self._send({                                                                                          // 264
        msg: 'sub',                                                                                         // 265
        id: id,                                                                                             // 266
        name: sub.name,                                                                                     // 267
        params: sub.params                                                                                  // 268
      });                                                                                                   // 269
    });                                                                                                     // 270
  };                                                                                                        // 271
                                                                                                            // 272
  if (Meteor.isServer) {                                                                                    // 273
    self._stream.on('message', Meteor.bindEnvironment(onMessage, Meteor._debug));                           // 274
    self._stream.on('reset', Meteor.bindEnvironment(onReset, Meteor._debug));                               // 275
  } else {                                                                                                  // 276
    self._stream.on('message', onMessage);                                                                  // 277
    self._stream.on('reset', onReset);                                                                      // 278
  }                                                                                                         // 279
                                                                                                            // 280
                                                                                                            // 281
  if (Meteor.isClient && Package.reload && options.reloadOnUpdate) {                                        // 282
    self._stream.on('update_available', function () {                                                       // 283
      // Start trying to migrate to a new version. Until all packages                                       // 284
      // signal that they're ready for a migration, the app will                                            // 285
      // continue running normally.                                                                         // 286
      Reload._reload();                                                                                     // 287
    });                                                                                                     // 288
  }                                                                                                         // 289
                                                                                                            // 290
};                                                                                                          // 291
                                                                                                            // 292
// A MethodInvoker manages sending a method to the server and calling the user's                            // 293
// callbacks. On construction, it registers itself in the connection's                                      // 294
// _methodInvokers map; it removes itself once the method is fully finished and                             // 295
// the callback is invoked. This occurs when it has both received a result,                                 // 296
// and the data written by it is fully visible.                                                             // 297
var MethodInvoker = function (options) {                                                                    // 298
  var self = this;                                                                                          // 299
                                                                                                            // 300
  // Public (within this file) fields.                                                                      // 301
  self.methodId = options.methodId;                                                                         // 302
  self.sentMessage = false;                                                                                 // 303
                                                                                                            // 304
  self._callback = options.callback;                                                                        // 305
  self._connection = options.connection;                                                                    // 306
  self._message = options.message;                                                                          // 307
  self._onResultReceived = options.onResultReceived || function () {};                                      // 308
  self._wait = options.wait;                                                                                // 309
  self._methodResult = null;                                                                                // 310
  self._dataVisible = false;                                                                                // 311
                                                                                                            // 312
  // Register with the connection.                                                                          // 313
  self._connection._methodInvokers[self.methodId] = self;                                                   // 314
};                                                                                                          // 315
_.extend(MethodInvoker.prototype, {                                                                         // 316
  // Sends the method message to the server. May be called additional times if                              // 317
  // we lose the connection and reconnect before receiving a result.                                        // 318
  sendMessage: function () {                                                                                // 319
    var self = this;                                                                                        // 320
    // This function is called before sending a method (including resending on                              // 321
    // reconnect). We should only (re)send methods where we don't already have a                            // 322
    // result!                                                                                              // 323
    if (self.gotResult())                                                                                   // 324
      throw new Error("sendingMethod is called on method with result");                                     // 325
                                                                                                            // 326
    // If we're re-sending it, it doesn't matter if data was written the first                              // 327
    // time.                                                                                                // 328
    self._dataVisible = false;                                                                              // 329
                                                                                                            // 330
    self.sentMessage = true;                                                                                // 331
                                                                                                            // 332
    // If this is a wait method, make all data messages be buffered until it is                             // 333
    // done.                                                                                                // 334
    if (self._wait)                                                                                         // 335
      self._connection._methodsBlockingQuiescence[self.methodId] = true;                                    // 336
                                                                                                            // 337
    // Actually send the message.                                                                           // 338
    self._connection._send(self._message);                                                                  // 339
  },                                                                                                        // 340
  // Invoke the callback, if we have both a result and know that all data has                               // 341
  // been written to the local cache.                                                                       // 342
  _maybeInvokeCallback: function () {                                                                       // 343
    var self = this;                                                                                        // 344
    if (self._methodResult && self._dataVisible) {                                                          // 345
      // Call the callback. (This won't throw: the callback was wrapped with                                // 346
      // bindEnvironment.)                                                                                  // 347
      self._callback(self._methodResult[0], self._methodResult[1]);                                         // 348
                                                                                                            // 349
      // Forget about this method.                                                                          // 350
      delete self._connection._methodInvokers[self.methodId];                                               // 351
                                                                                                            // 352
      // Let the connection know that this method is finished, so it can try to                             // 353
      // move on to the next block of methods.                                                              // 354
      self._connection._outstandingMethodFinished();                                                        // 355
    }                                                                                                       // 356
  },                                                                                                        // 357
  // Call with the result of the method from the server. Only may be called                                 // 358
  // once; once it is called, you should not call sendMessage again.                                        // 359
  // If the user provided an onResultReceived callback, call it immediately.                                // 360
  // Then invoke the main callback if data is also visible.                                                 // 361
  receiveResult: function (err, result) {                                                                   // 362
    var self = this;                                                                                        // 363
    if (self.gotResult())                                                                                   // 364
      throw new Error("Methods should only receive results once");                                          // 365
    self._methodResult = [err, result];                                                                     // 366
    self._onResultReceived(err, result);                                                                    // 367
    self._maybeInvokeCallback();                                                                            // 368
  },                                                                                                        // 369
  // Call this when all data written by the method is visible. This means that                              // 370
  // the method has returns its "data is done" message *AND* all server                                     // 371
  // documents that are buffered at that time have been written to the local                                // 372
  // cache. Invokes the main callback if the result has been received.                                      // 373
  dataVisible: function () {                                                                                // 374
    var self = this;                                                                                        // 375
    self._dataVisible = true;                                                                               // 376
    self._maybeInvokeCallback();                                                                            // 377
  },                                                                                                        // 378
  // True if receiveResult has been called.                                                                 // 379
  gotResult: function () {                                                                                  // 380
    var self = this;                                                                                        // 381
    return !!self._methodResult;                                                                            // 382
  }                                                                                                         // 383
});                                                                                                         // 384
                                                                                                            // 385
_.extend(Connection.prototype, {                                                                            // 386
  // 'name' is the name of the data on the wire that should go in the                                       // 387
  // store. 'wrappedStore' should be an object with methods beginUpdate, update,                            // 388
  // endUpdate, saveOriginals, retrieveOriginals. see Collection for an example.                            // 389
  registerStore: function (name, wrappedStore) {                                                            // 390
    var self = this;                                                                                        // 391
                                                                                                            // 392
    if (name in self._stores)                                                                               // 393
      return false;                                                                                         // 394
                                                                                                            // 395
    // Wrap the input object in an object which makes any store method not                                  // 396
    // implemented by 'store' into a no-op.                                                                 // 397
    var store = {};                                                                                         // 398
    _.each(['update', 'beginUpdate', 'endUpdate', 'saveOriginals',                                          // 399
            'retrieveOriginals'], function (method) {                                                       // 400
              store[method] = function () {                                                                 // 401
                return (wrappedStore[method]                                                                // 402
                        ? wrappedStore[method].apply(wrappedStore, arguments)                               // 403
                        : undefined);                                                                       // 404
              };                                                                                            // 405
            });                                                                                             // 406
                                                                                                            // 407
    self._stores[name] = store;                                                                             // 408
                                                                                                            // 409
    var queued = self._updatesForUnknownStores[name];                                                       // 410
    if (queued) {                                                                                           // 411
      store.beginUpdate(queued.length, false);                                                              // 412
      _.each(queued, function (msg) {                                                                       // 413
        store.update(msg);                                                                                  // 414
      });                                                                                                   // 415
      store.endUpdate();                                                                                    // 416
      delete self._updatesForUnknownStores[name];                                                           // 417
    }                                                                                                       // 418
                                                                                                            // 419
    return true;                                                                                            // 420
  },                                                                                                        // 421
                                                                                                            // 422
  subscribe: function (name /* .. [arguments] .. (callback|callbacks) */) {                                 // 423
    var self = this;                                                                                        // 424
                                                                                                            // 425
    var params = Array.prototype.slice.call(arguments, 1);                                                  // 426
    var callbacks = {};                                                                                     // 427
    if (params.length) {                                                                                    // 428
      var lastParam = params[params.length - 1];                                                            // 429
      if (typeof lastParam === "function") {                                                                // 430
        callbacks.onReady = params.pop();                                                                   // 431
      } else if (lastParam && (typeof lastParam.onReady === "function" ||                                   // 432
                               typeof lastParam.onError === "function")) {                                  // 433
        callbacks = params.pop();                                                                           // 434
      }                                                                                                     // 435
    }                                                                                                       // 436
                                                                                                            // 437
    // Is there an existing sub with the same name and param, run in an                                     // 438
    // invalidated Computation? This will happen if we are rerunning an                                     // 439
    // existing computation.                                                                                // 440
    //                                                                                                      // 441
    // For example, consider a rerun of:                                                                    // 442
    //                                                                                                      // 443
    //     Deps.autorun(function () {                                                                       // 444
    //       Meteor.subscribe("foo", Session.get("foo"));                                                   // 445
    //       Meteor.subscribe("bar", Session.get("bar"));                                                   // 446
    //     });                                                                                              // 447
    //                                                                                                      // 448
    // If "foo" has changed but "bar" has not, we will match the "bar"                                      // 449
    // subcribe to an existing inactive subscription in order to not                                        // 450
    // unsub and resub the subscription unnecessarily.                                                      // 451
    //                                                                                                      // 452
    // We only look for one such sub; if there are N apparently-identical subs                              // 453
    // being invalidated, we will require N matching subscribe calls to keep                                // 454
    // them all active.                                                                                     // 455
    var existing = _.find(self._subscriptions, function (sub) {                                             // 456
      return sub.inactive && sub.name === name &&                                                           // 457
        EJSON.equals(sub.params, params);                                                                   // 458
    });                                                                                                     // 459
                                                                                                            // 460
    var id;                                                                                                 // 461
    if (existing) {                                                                                         // 462
      id = existing.id;                                                                                     // 463
      existing.inactive = false; // reactivate                                                              // 464
                                                                                                            // 465
      if (callbacks.onReady) {                                                                              // 466
        // If the sub is not already ready, replace any ready callback with the                             // 467
        // one provided now. (It's not really clear what users would expect for                             // 468
        // an onReady callback inside an autorun; the semantics we provide is                               // 469
        // that at the time the sub first becomes ready, we call the last                                   // 470
        // onReady callback provided, if any.)                                                              // 471
        if (!existing.ready)                                                                                // 472
          existing.readyCallback = callbacks.onReady;                                                       // 473
      }                                                                                                     // 474
      if (callbacks.onError) {                                                                              // 475
        // Replace existing callback if any, so that errors aren't                                          // 476
        // double-reported.                                                                                 // 477
        existing.errorCallback = callbacks.onError;                                                         // 478
      }                                                                                                     // 479
    } else {                                                                                                // 480
      // New sub! Generate an id, save it locally, and send message.                                        // 481
      id = Random.id();                                                                                     // 482
      self._subscriptions[id] = {                                                                           // 483
        id: id,                                                                                             // 484
        name: name,                                                                                         // 485
        params: params,                                                                                     // 486
        inactive: false,                                                                                    // 487
        ready: false,                                                                                       // 488
        readyDeps: (typeof Deps !== "undefined") && new Deps.Dependency,                                    // 489
        readyCallback: callbacks.onReady,                                                                   // 490
        errorCallback: callbacks.onError                                                                    // 491
      };                                                                                                    // 492
      self._send({msg: 'sub', id: id, name: name, params: params});                                         // 493
    }                                                                                                       // 494
                                                                                                            // 495
    // return a handle to the application.                                                                  // 496
    var handle = {                                                                                          // 497
      stop: function () {                                                                                   // 498
        if (!_.has(self._subscriptions, id))                                                                // 499
          return;                                                                                           // 500
        self._send({msg: 'unsub', id: id});                                                                 // 501
        delete self._subscriptions[id];                                                                     // 502
      },                                                                                                    // 503
      ready: function () {                                                                                  // 504
        // return false if we've unsubscribed.                                                              // 505
        if (!_.has(self._subscriptions, id))                                                                // 506
          return false;                                                                                     // 507
        var record = self._subscriptions[id];                                                               // 508
        record.readyDeps && record.readyDeps.depend();                                                      // 509
        return record.ready;                                                                                // 510
      }                                                                                                     // 511
    };                                                                                                      // 512
                                                                                                            // 513
    if (Deps.active) {                                                                                      // 514
      // We're in a reactive computation, so we'd like to unsubscribe when the                              // 515
      // computation is invalidated... but not if the rerun just re-subscribes                              // 516
      // to the same subscription!  When a rerun happens, we use onInvalidate                               // 517
      // as a change to mark the subscription "inactive" so that it can                                     // 518
      // be reused from the rerun.  If it isn't reused, it's killed from                                    // 519
      // an afterFlush.                                                                                     // 520
      Deps.onInvalidate(function (c) {                                                                      // 521
        if (_.has(self._subscriptions, id))                                                                 // 522
          self._subscriptions[id].inactive = true;                                                          // 523
                                                                                                            // 524
        Deps.afterFlush(function () {                                                                       // 525
          if (_.has(self._subscriptions, id) &&                                                             // 526
              self._subscriptions[id].inactive)                                                             // 527
            handle.stop();                                                                                  // 528
        });                                                                                                 // 529
      });                                                                                                   // 530
    }                                                                                                       // 531
                                                                                                            // 532
    return handle;                                                                                          // 533
  },                                                                                                        // 534
                                                                                                            // 535
  // options:                                                                                               // 536
  // - onLateError {Function(error)} called if an error was received after the ready event.                 // 537
  //     (errors received before ready cause an error to be thrown)                                         // 538
  _subscribeAndWait: function (name, args, options) {                                                       // 539
    var self = this;                                                                                        // 540
    var f = new Future();                                                                                   // 541
    var ready = false;                                                                                      // 542
    args = args || [];                                                                                      // 543
    args.push({                                                                                             // 544
      onReady: function () {                                                                                // 545
        ready = true;                                                                                       // 546
        f['return']();                                                                                      // 547
      },                                                                                                    // 548
      onError: function (e) {                                                                               // 549
        if (!ready)                                                                                         // 550
          f['throw'](e);                                                                                    // 551
        else                                                                                                // 552
          options && options.onLateError && options.onLateError(e);                                         // 553
      }                                                                                                     // 554
    });                                                                                                     // 555
                                                                                                            // 556
    self.subscribe.apply(self, [name].concat(args));                                                        // 557
    f.wait();                                                                                               // 558
  },                                                                                                        // 559
                                                                                                            // 560
  methods: function (methods) {                                                                             // 561
    var self = this;                                                                                        // 562
    _.each(methods, function (func, name) {                                                                 // 563
      if (self._methodHandlers[name])                                                                       // 564
        throw new Error("A method named '" + name + "' is already defined");                                // 565
      self._methodHandlers[name] = func;                                                                    // 566
    });                                                                                                     // 567
  },                                                                                                        // 568
                                                                                                            // 569
  call: function (name /* .. [arguments] .. callback */) {                                                  // 570
    // if it's a function, the last argument is the result callback,                                        // 571
    // not a parameter to the remote method.                                                                // 572
    var args = Array.prototype.slice.call(arguments, 1);                                                    // 573
    if (args.length && typeof args[args.length - 1] === "function")                                         // 574
      var callback = args.pop();                                                                            // 575
    return this.apply(name, args, callback);                                                                // 576
  },                                                                                                        // 577
                                                                                                            // 578
  // @param options {Optional Object}                                                                       // 579
  //   wait: Boolean - Should we wait to call this until all current methods                                // 580
  //                   are fully finished, and block subsequent method calls                                // 581
  //                   until this method is fully finished?                                                 // 582
  //                   (does not affect methods called from within this method)                             // 583
  //   onResultReceived: Function - a callback to call as soon as the method                                // 584
  //                                result is received. the data written by                                 // 585
  //                                the method may not yet be in the cache!                                 // 586
  // @param callback {Optional Function}                                                                    // 587
  apply: function (name, args, options, callback) {                                                         // 588
    var self = this;                                                                                        // 589
                                                                                                            // 590
    // We were passed 3 arguments. They may be either (name, args, options)                                 // 591
    // or (name, args, callback)                                                                            // 592
    if (!callback && typeof options === 'function') {                                                       // 593
      callback = options;                                                                                   // 594
      options = {};                                                                                         // 595
    }                                                                                                       // 596
    options = options || {};                                                                                // 597
                                                                                                            // 598
    if (callback) {                                                                                         // 599
      // XXX would it be better form to do the binding in stream.on,                                        // 600
      // or caller, instead of here?                                                                        // 601
      callback = Meteor.bindEnvironment(callback, function (e) {                                            // 602
        // XXX improve error message (and how we report it)                                                 // 603
        Meteor._debug("Exception while delivering result of invoking '" +                                   // 604
                      name + "'", e, e.stack);                                                              // 605
      });                                                                                                   // 606
    }                                                                                                       // 607
                                                                                                            // 608
    // Lazily allocate method ID once we know that it'll be needed.                                         // 609
    var methodId = (function () {                                                                           // 610
      var id;                                                                                               // 611
      return function () {                                                                                  // 612
        if (id === undefined)                                                                               // 613
          id = '' + (self._nextMethodId++);                                                                 // 614
        return id;                                                                                          // 615
      };                                                                                                    // 616
    })();                                                                                                   // 617
                                                                                                            // 618
    // Run the stub, if we have one. The stub is supposed to make some                                      // 619
    // temporary writes to the database to give the user a smooth experience                                // 620
    // until the actual result of executing the method comes back from the                                  // 621
    // server (whereupon the temporary writes to the database will be reversed                              // 622
    // during the beginUpdate/endUpdate process.)                                                           // 623
    //                                                                                                      // 624
    // Normally, we ignore the return value of the stub (even if it is an                                   // 625
    // exception), in favor of the real return value from the server. The                                   // 626
    // exception is if the *caller* is a stub. In that case, we're not going                                // 627
    // to do a RPC, so we use the return value of the stub as our return                                    // 628
    // value.                                                                                               // 629
                                                                                                            // 630
    var enclosing = DDP._CurrentInvocation.get();                                                           // 631
    var alreadyInSimulation = enclosing && enclosing.isSimulation;                                          // 632
                                                                                                            // 633
    var stub = self._methodHandlers[name];                                                                  // 634
    if (stub) {                                                                                             // 635
      var setUserId = function(userId) {                                                                    // 636
        self.setUserId(userId);                                                                             // 637
      };                                                                                                    // 638
      var invocation = new MethodInvocation({                                                               // 639
        isSimulation: true,                                                                                 // 640
        userId: self.userId(), setUserId: setUserId,                                                        // 641
        sessionData: self._sessionData                                                                      // 642
      });                                                                                                   // 643
                                                                                                            // 644
      if (!alreadyInSimulation)                                                                             // 645
        self._saveOriginals();                                                                              // 646
                                                                                                            // 647
      try {                                                                                                 // 648
        // Note that unlike in the corresponding server code, we never audit                                // 649
        // that stubs check() their arguments.                                                              // 650
        var ret = DDP._CurrentInvocation.withValue(invocation, function () {                                // 651
          if (Meteor.isServer) {                                                                            // 652
            // Because saveOriginals and retrieveOriginals aren't reentrant,                                // 653
            // don't allow stubs to yield.                                                                  // 654
            return Meteor._noYieldsAllowed(function () {                                                    // 655
              return stub.apply(invocation, EJSON.clone(args));                                             // 656
            });                                                                                             // 657
          } else {                                                                                          // 658
            return stub.apply(invocation, EJSON.clone(args));                                               // 659
          }                                                                                                 // 660
        });                                                                                                 // 661
      }                                                                                                     // 662
      catch (e) {                                                                                           // 663
        var exception = e;                                                                                  // 664
      }                                                                                                     // 665
                                                                                                            // 666
      if (!alreadyInSimulation)                                                                             // 667
        self._retrieveAndStoreOriginals(methodId());                                                        // 668
    }                                                                                                       // 669
                                                                                                            // 670
    // If we're in a simulation, stop and return the result we have,                                        // 671
    // rather than going on to do an RPC. If there was no stub,                                             // 672
    // we'll end up returning undefined.                                                                    // 673
    if (alreadyInSimulation) {                                                                              // 674
      if (callback) {                                                                                       // 675
        callback(exception, ret);                                                                           // 676
        return undefined;                                                                                   // 677
      }                                                                                                     // 678
      if (exception)                                                                                        // 679
        throw exception;                                                                                    // 680
      return ret;                                                                                           // 681
    }                                                                                                       // 682
                                                                                                            // 683
    // If an exception occurred in a stub, and we're ignoring it                                            // 684
    // because we're doing an RPC and want to use what the server                                           // 685
    // returns instead, log it so the developer knows.                                                      // 686
    //                                                                                                      // 687
    // Tests can set the 'expected' flag on an exception so it won't                                        // 688
    // go to log.                                                                                           // 689
    if (exception && !exception.expected) {                                                                 // 690
      Meteor._debug("Exception while simulating the effect of invoking '" +                                 // 691
                    name + "'", exception, exception.stack);                                                // 692
    }                                                                                                       // 693
                                                                                                            // 694
                                                                                                            // 695
    // At this point we're definitely doing an RPC, and we're going to                                      // 696
    // return the value of the RPC to the caller.                                                           // 697
                                                                                                            // 698
    // If the caller didn't give a callback, decide what to do.                                             // 699
    if (!callback) {                                                                                        // 700
      if (Meteor.isClient) {                                                                                // 701
        // On the client, we don't have fibers, so we can't block. The                                      // 702
        // only thing we can do is to return undefined and discard the                                      // 703
        // result of the RPC.                                                                               // 704
        callback = function () {};                                                                          // 705
      } else {                                                                                              // 706
        // On the server, make the function synchronous. Throw on                                           // 707
        // errors, return on success.                                                                       // 708
        var future = new Future;                                                                            // 709
        callback = future.resolver();                                                                       // 710
      }                                                                                                     // 711
    }                                                                                                       // 712
    // Send the RPC. Note that on the client, it is important that the                                      // 713
    // stub have finished before we send the RPC, so that we know we have                                   // 714
    // a complete list of which local documents the stub wrote.                                             // 715
    var methodInvoker = new MethodInvoker({                                                                 // 716
      methodId: methodId(),                                                                                 // 717
      callback: callback,                                                                                   // 718
      connection: self,                                                                                     // 719
      onResultReceived: options.onResultReceived,                                                           // 720
      wait: !!options.wait,                                                                                 // 721
      message: {                                                                                            // 722
        msg: 'method',                                                                                      // 723
        method: name,                                                                                       // 724
        params: args,                                                                                       // 725
        id: methodId()                                                                                      // 726
      }                                                                                                     // 727
    });                                                                                                     // 728
                                                                                                            // 729
    if (options.wait) {                                                                                     // 730
      // It's a wait method! Wait methods go in their own block.                                            // 731
      self._outstandingMethodBlocks.push(                                                                   // 732
        {wait: true, methods: [methodInvoker]});                                                            // 733
    } else {                                                                                                // 734
      // Not a wait method. Start a new block if the previous block was a wait                              // 735
      // block, and add it to the last block of methods.                                                    // 736
      if (_.isEmpty(self._outstandingMethodBlocks) ||                                                       // 737
          _.last(self._outstandingMethodBlocks).wait)                                                       // 738
        self._outstandingMethodBlocks.push({wait: false, methods: []});                                     // 739
      _.last(self._outstandingMethodBlocks).methods.push(methodInvoker);                                    // 740
    }                                                                                                       // 741
                                                                                                            // 742
    // If we added it to the first block, send it out now.                                                  // 743
    if (self._outstandingMethodBlocks.length === 1)                                                         // 744
      methodInvoker.sendMessage();                                                                          // 745
                                                                                                            // 746
    // If we're using the default callback on the server,                                                   // 747
    // block waiting for the result.                                                                        // 748
    if (future) {                                                                                           // 749
      return future.wait();                                                                                 // 750
    }                                                                                                       // 751
    return undefined;                                                                                       // 752
  },                                                                                                        // 753
                                                                                                            // 754
  // Before calling a method stub, prepare all stores to track changes and allow                            // 755
  // _retrieveAndStoreOriginals to get the original versions of changed                                     // 756
  // documents.                                                                                             // 757
  _saveOriginals: function () {                                                                             // 758
    var self = this;                                                                                        // 759
    _.each(self._stores, function (s) {                                                                     // 760
      s.saveOriginals();                                                                                    // 761
    });                                                                                                     // 762
  },                                                                                                        // 763
  // Retrieves the original versions of all documents modified by the stub for                              // 764
  // method 'methodId' from all stores and saves them to _serverDocuments (keyed                            // 765
  // by document) and _documentsWrittenByStub (keyed by method ID).                                         // 766
  _retrieveAndStoreOriginals: function (methodId) {                                                         // 767
    var self = this;                                                                                        // 768
    if (self._documentsWrittenByStub[methodId])                                                             // 769
      throw new Error("Duplicate methodId in _retrieveAndStoreOriginals");                                  // 770
                                                                                                            // 771
    var docsWritten = [];                                                                                   // 772
    _.each(self._stores, function (s, collection) {                                                         // 773
      var originals = s.retrieveOriginals();                                                                // 774
      _.each(originals, function (doc, id) {                                                                // 775
        if (typeof id !== 'string')                                                                         // 776
          throw new Error("id is not a string");                                                            // 777
        docsWritten.push({collection: collection, id: id});                                                 // 778
        var serverDoc = Meteor._ensure(self._serverDocuments, collection, id);                              // 779
        if (serverDoc.writtenByStubs) {                                                                     // 780
          // We're not the first stub to write this doc. Just add our method ID                             // 781
          // to the record.                                                                                 // 782
          serverDoc.writtenByStubs[methodId] = true;                                                        // 783
        } else {                                                                                            // 784
          // First stub! Save the original value and our method ID.                                         // 785
          serverDoc.document = doc;                                                                         // 786
          serverDoc.flushCallbacks = [];                                                                    // 787
          serverDoc.writtenByStubs = {};                                                                    // 788
          serverDoc.writtenByStubs[methodId] = true;                                                        // 789
        }                                                                                                   // 790
      });                                                                                                   // 791
    });                                                                                                     // 792
    if (!_.isEmpty(docsWritten)) {                                                                          // 793
      self._documentsWrittenByStub[methodId] = docsWritten;                                                 // 794
    }                                                                                                       // 795
  },                                                                                                        // 796
                                                                                                            // 797
  // This is very much a private function we use to make the tests                                          // 798
  // take up fewer server resources after they complete.                                                    // 799
  _unsubscribeAll: function () {                                                                            // 800
    var self = this;                                                                                        // 801
    _.each(_.clone(self._subscriptions), function (sub, id) {                                               // 802
      self._send({msg: 'unsub', id: id});                                                                   // 803
      delete self._subscriptions[id];                                                                       // 804
    });                                                                                                     // 805
  },                                                                                                        // 806
                                                                                                            // 807
  // Sends the DDP stringification of the given message object                                              // 808
  _send: function (obj) {                                                                                   // 809
    var self = this;                                                                                        // 810
    self._stream.send(stringifyDDP(obj));                                                                   // 811
  },                                                                                                        // 812
                                                                                                            // 813
  status: function (/*passthrough args*/) {                                                                 // 814
    var self = this;                                                                                        // 815
    return self._stream.status.apply(self._stream, arguments);                                              // 816
  },                                                                                                        // 817
                                                                                                            // 818
  reconnect: function (/*passthrough args*/) {                                                              // 819
    var self = this;                                                                                        // 820
    return self._stream.reconnect.apply(self._stream, arguments);                                           // 821
  },                                                                                                        // 822
                                                                                                            // 823
  disconnect: function (/*passthrough args*/) {                                                             // 824
    var self = this;                                                                                        // 825
    return self._stream.disconnect.apply(self._stream, arguments);                                          // 826
  },                                                                                                        // 827
                                                                                                            // 828
  close: function () {                                                                                      // 829
    var self = this;                                                                                        // 830
    return self._stream.disconnect({_permanent: true});                                                     // 831
  },                                                                                                        // 832
                                                                                                            // 833
  ///                                                                                                       // 834
  /// Reactive user system                                                                                  // 835
  ///                                                                                                       // 836
  userId: function () {                                                                                     // 837
    var self = this;                                                                                        // 838
    if (self._userIdDeps)                                                                                   // 839
      self._userIdDeps.depend();                                                                            // 840
    return self._userId;                                                                                    // 841
  },                                                                                                        // 842
                                                                                                            // 843
  setUserId: function (userId) {                                                                            // 844
    var self = this;                                                                                        // 845
    // Avoid invalidating dependents if setUserId is called with current value.                             // 846
    if (self._userId === userId)                                                                            // 847
      return;                                                                                               // 848
    self._userId = userId;                                                                                  // 849
    if (self._userIdDeps)                                                                                   // 850
      self._userIdDeps.changed();                                                                           // 851
  },                                                                                                        // 852
                                                                                                            // 853
  // Returns true if we are in a state after reconnect of waiting for subs to be                            // 854
  // revived or early methods to finish their data, or we are waiting for a                                 // 855
  // "wait" method to finish.                                                                               // 856
  _waitingForQuiescence: function () {                                                                      // 857
    var self = this;                                                                                        // 858
    return (! _.isEmpty(self._subsBeingRevived) ||                                                          // 859
            ! _.isEmpty(self._methodsBlockingQuiescence));                                                  // 860
  },                                                                                                        // 861
                                                                                                            // 862
  // Returns true if any method whose message has been sent to the server has                               // 863
  // not yet invoked its user callback.                                                                     // 864
  _anyMethodsAreOutstanding: function () {                                                                  // 865
    var self = this;                                                                                        // 866
    return _.any(_.pluck(self._methodInvokers, 'sentMessage'));                                             // 867
  },                                                                                                        // 868
                                                                                                            // 869
  _livedata_connected: function (msg) {                                                                     // 870
    var self = this;                                                                                        // 871
                                                                                                            // 872
    // If this is a reconnect, we'll have to reset all stores.                                              // 873
    if (self._lastSessionId)                                                                                // 874
      self._resetStores = true;                                                                             // 875
                                                                                                            // 876
    if (typeof (msg.session) === "string") {                                                                // 877
      var reconnectedToPreviousSession = (self._lastSessionId === msg.session);                             // 878
      self._lastSessionId = msg.session;                                                                    // 879
    }                                                                                                       // 880
                                                                                                            // 881
    if (reconnectedToPreviousSession) {                                                                     // 882
      // Successful reconnection -- pick up where we left off.  Note that right                             // 883
      // now, this never happens: the server never connects us to a previous                                // 884
      // session, because DDP doesn't provide enough data for the server to know                            // 885
      // what messages the client has processed. We need to improve DDP to make                             // 886
      // this possible, at which point we'll probably need more code here.                                  // 887
      return;                                                                                               // 888
    }                                                                                                       // 889
                                                                                                            // 890
    // Server doesn't have our data any more. Re-sync a new session.                                        // 891
                                                                                                            // 892
    // Forget about messages we were buffering for unknown collections. They'll                             // 893
    // be resent if still relevant.                                                                         // 894
    self._updatesForUnknownStores = {};                                                                     // 895
                                                                                                            // 896
    if (self._resetStores) {                                                                                // 897
      // Forget about the effects of stubs. We'll be resetting all collections                              // 898
      // anyway.                                                                                            // 899
      self._documentsWrittenByStub = {};                                                                    // 900
      self._serverDocuments = {};                                                                           // 901
    }                                                                                                       // 902
                                                                                                            // 903
    // Clear _afterUpdateCallbacks.                                                                         // 904
    self._afterUpdateCallbacks = [];                                                                        // 905
                                                                                                            // 906
    // Mark all named subscriptions which are ready (ie, we already called the                              // 907
    // ready callback) as needing to be revived.                                                            // 908
    // XXX We should also block reconnect quiescence until unnamed subscriptions                            // 909
    //     (eg, autopublish) are done re-publishing to avoid flicker!                                       // 910
    self._subsBeingRevived = {};                                                                            // 911
    _.each(self._subscriptions, function (sub, id) {                                                        // 912
      if (sub.ready)                                                                                        // 913
        self._subsBeingRevived[id] = true;                                                                  // 914
    });                                                                                                     // 915
                                                                                                            // 916
    // Arrange for "half-finished" methods to have their callbacks run, and                                 // 917
    // track methods that were sent on this connection so that we don't                                     // 918
    // quiesce until they are all done.                                                                     // 919
    //                                                                                                      // 920
    // Start by clearing _methodsBlockingQuiescence: methods sent before                                    // 921
    // reconnect don't matter, and any "wait" methods sent on the new connection                            // 922
    // that we drop here will be restored by the loop below.                                                // 923
    self._methodsBlockingQuiescence = {};                                                                   // 924
    if (self._resetStores) {                                                                                // 925
      _.each(self._methodInvokers, function (invoker) {                                                     // 926
        if (invoker.gotResult()) {                                                                          // 927
          // This method already got its result, but it didn't call its callback                            // 928
          // because its data didn't become visible. We did not resend the                                  // 929
          // method RPC. We'll call its callback when we get a full quiesce,                                // 930
          // since that's as close as we'll get to "data must be visible".                                  // 931
          self._afterUpdateCallbacks.push(_.bind(invoker.dataVisible, invoker));                            // 932
        } else if (invoker.sentMessage) {                                                                   // 933
          // This method has been sent on this connection (maybe as a resend                                // 934
          // from the last connection, maybe from onReconnect, maybe just very                              // 935
          // quickly before processing the connected message).                                              // 936
          //                                                                                                // 937
          // We don't need to do anything special to ensure its callbacks get                               // 938
          // called, but we'll count it as a method which is preventing                                     // 939
          // reconnect quiescence. (eg, it might be a login method that was run                             // 940
          // from onReconnect, and we don't want to see flicker by seeing a                                 // 941
          // logged-out state.)                                                                             // 942
          self._methodsBlockingQuiescence[invoker.methodId] = true;                                         // 943
        }                                                                                                   // 944
      });                                                                                                   // 945
    }                                                                                                       // 946
                                                                                                            // 947
    self._messagesBufferedUntilQuiescence = [];                                                             // 948
                                                                                                            // 949
    // If we're not waiting on any methods or subs, we can reset the stores and                             // 950
    // call the callbacks immediately.                                                                      // 951
    if (!self._waitingForQuiescence()) {                                                                    // 952
      if (self._resetStores) {                                                                              // 953
        _.each(self._stores, function (s) {                                                                 // 954
          s.beginUpdate(0, true);                                                                           // 955
          s.endUpdate();                                                                                    // 956
        });                                                                                                 // 957
        self._resetStores = false;                                                                          // 958
      }                                                                                                     // 959
      self._runAfterUpdateCallbacks();                                                                      // 960
    }                                                                                                       // 961
  },                                                                                                        // 962
                                                                                                            // 963
                                                                                                            // 964
  _processOneDataMessage: function (msg, updates) {                                                         // 965
    var self = this;                                                                                        // 966
    // Using underscore here so as not to need to capitalize.                                               // 967
    self['_process_' + msg.msg](msg, updates);                                                              // 968
  },                                                                                                        // 969
                                                                                                            // 970
                                                                                                            // 971
  _livedata_data: function (msg) {                                                                          // 972
    var self = this;                                                                                        // 973
                                                                                                            // 974
    // collection name -> array of messages                                                                 // 975
    var updates = {};                                                                                       // 976
                                                                                                            // 977
    if (self._waitingForQuiescence()) {                                                                     // 978
      self._messagesBufferedUntilQuiescence.push(msg);                                                      // 979
                                                                                                            // 980
      if (msg.msg === "nosub")                                                                              // 981
        delete self._subsBeingRevived[msg.id];                                                              // 982
                                                                                                            // 983
      _.each(msg.subs || [], function (subId) {                                                             // 984
        delete self._subsBeingRevived[subId];                                                               // 985
      });                                                                                                   // 986
      _.each(msg.methods || [], function (methodId) {                                                       // 987
        delete self._methodsBlockingQuiescence[methodId];                                                   // 988
      });                                                                                                   // 989
                                                                                                            // 990
      if (self._waitingForQuiescence())                                                                     // 991
        return;                                                                                             // 992
                                                                                                            // 993
      // No methods or subs are blocking quiescence!                                                        // 994
      // We'll now process and all of our buffered messages, reset all stores,                              // 995
      // and apply them all at once.                                                                        // 996
      _.each(self._messagesBufferedUntilQuiescence, function (bufferedMsg) {                                // 997
        self._processOneDataMessage(bufferedMsg, updates);                                                  // 998
      });                                                                                                   // 999
      self._messagesBufferedUntilQuiescence = [];                                                           // 1000
    } else {                                                                                                // 1001
      self._processOneDataMessage(msg, updates);                                                            // 1002
    }                                                                                                       // 1003
                                                                                                            // 1004
    if (self._resetStores || !_.isEmpty(updates)) {                                                         // 1005
      // Begin a transactional update of each store.                                                        // 1006
      _.each(self._stores, function (s, storeName) {                                                        // 1007
        s.beginUpdate(_.has(updates, storeName) ? updates[storeName].length : 0,                            // 1008
                      self._resetStores);                                                                   // 1009
      });                                                                                                   // 1010
      self._resetStores = false;                                                                            // 1011
                                                                                                            // 1012
      _.each(updates, function (updateMessages, storeName) {                                                // 1013
        var store = self._stores[storeName];                                                                // 1014
        if (store) {                                                                                        // 1015
          _.each(updateMessages, function (updateMessage) {                                                 // 1016
            store.update(updateMessage);                                                                    // 1017
          });                                                                                               // 1018
        } else {                                                                                            // 1019
          // Nobody's listening for this data. Queue it up until                                            // 1020
          // someone wants it.                                                                              // 1021
          // XXX memory use will grow without bound if you forget to                                        // 1022
          // create a collection or just don't care about it... going                                       // 1023
          // to have to do something about that.                                                            // 1024
          if (!_.has(self._updatesForUnknownStores, storeName))                                             // 1025
            self._updatesForUnknownStores[storeName] = [];                                                  // 1026
          Array.prototype.push.apply(self._updatesForUnknownStores[storeName],                              // 1027
                                     updateMessages);                                                       // 1028
        }                                                                                                   // 1029
      });                                                                                                   // 1030
                                                                                                            // 1031
      // End update transaction.                                                                            // 1032
      _.each(self._stores, function (s) { s.endUpdate(); });                                                // 1033
    }                                                                                                       // 1034
                                                                                                            // 1035
    self._runAfterUpdateCallbacks();                                                                        // 1036
  },                                                                                                        // 1037
                                                                                                            // 1038
  // Call any callbacks deferred with _runWhenAllServerDocsAreFlushed whose                                 // 1039
  // relevant docs have been flushed, as well as dataVisible callbacks at                                   // 1040
  // reconnect-quiescence time.                                                                             // 1041
  _runAfterUpdateCallbacks: function () {                                                                   // 1042
    var self = this;                                                                                        // 1043
    var callbacks = self._afterUpdateCallbacks;                                                             // 1044
    self._afterUpdateCallbacks = [];                                                                        // 1045
    _.each(callbacks, function (c) {                                                                        // 1046
      c();                                                                                                  // 1047
    });                                                                                                     // 1048
  },                                                                                                        // 1049
                                                                                                            // 1050
  _pushUpdate: function (updates, collection, msg) {                                                        // 1051
    var self = this;                                                                                        // 1052
    if (!_.has(updates, collection)) {                                                                      // 1053
      updates[collection] = [];                                                                             // 1054
    }                                                                                                       // 1055
    updates[collection].push(msg);                                                                          // 1056
  },                                                                                                        // 1057
                                                                                                            // 1058
  _process_added: function (msg, updates) {                                                                 // 1059
    var self = this;                                                                                        // 1060
    var serverDoc = Meteor._get(self._serverDocuments, msg.collection, msg.id);                             // 1061
    if (serverDoc) {                                                                                        // 1062
      // Some outstanding stub wrote here.                                                                  // 1063
      if (serverDoc.document !== undefined) {                                                               // 1064
        throw new Error("It doesn't make sense to be adding something we know exists: "                     // 1065
                        + msg.id);                                                                          // 1066
      }                                                                                                     // 1067
      serverDoc.document = msg.fields || {};                                                                // 1068
      serverDoc.document._id = LocalCollection._idParse(msg.id);                                            // 1069
    } else {                                                                                                // 1070
      self._pushUpdate(updates, msg.collection, msg);                                                       // 1071
    }                                                                                                       // 1072
  },                                                                                                        // 1073
                                                                                                            // 1074
  _process_changed: function (msg, updates) {                                                               // 1075
    var self = this;                                                                                        // 1076
    var serverDoc = Meteor._get(self._serverDocuments, msg.collection, msg.id);                             // 1077
    if (serverDoc) {                                                                                        // 1078
      if (serverDoc.document === undefined) {                                                               // 1079
        throw new Error("It doesn't make sense to be changing something we don't think exists: "            // 1080
                        + msg.id);                                                                          // 1081
      }                                                                                                     // 1082
      LocalCollection._applyChanges(serverDoc.document, msg.fields);                                        // 1083
    } else {                                                                                                // 1084
      self._pushUpdate(updates, msg.collection, msg);                                                       // 1085
    }                                                                                                       // 1086
  },                                                                                                        // 1087
                                                                                                            // 1088
  _process_removed: function (msg, updates) {                                                               // 1089
    var self = this;                                                                                        // 1090
    var serverDoc = Meteor._get(                                                                            // 1091
      self._serverDocuments, msg.collection, msg.id);                                                       // 1092
    if (serverDoc) {                                                                                        // 1093
      // Some outstanding stub wrote here.                                                                  // 1094
      if (serverDoc.document === undefined) {                                                               // 1095
        throw new Error("It doesn't make sense to be deleting something we don't know exists: "             // 1096
                        + msg.id);                                                                          // 1097
      }                                                                                                     // 1098
      serverDoc.document = undefined;                                                                       // 1099
    } else {                                                                                                // 1100
      self._pushUpdate(updates, msg.collection, {                                                           // 1101
        msg: 'removed',                                                                                     // 1102
        collection: msg.collection,                                                                         // 1103
        id: msg.id                                                                                          // 1104
      });                                                                                                   // 1105
    }                                                                                                       // 1106
  },                                                                                                        // 1107
                                                                                                            // 1108
  _process_updated: function (msg, updates) {                                                               // 1109
    var self = this;                                                                                        // 1110
    // Process "method done" messages.                                                                      // 1111
    _.each(msg.methods, function (methodId) {                                                               // 1112
      _.each(self._documentsWrittenByStub[methodId], function (written) {                                   // 1113
        var serverDoc = Meteor._get(self._serverDocuments,                                                  // 1114
                                    written.collection, written.id);                                        // 1115
        if (!serverDoc)                                                                                     // 1116
          throw new Error("Lost serverDoc for " + JSON.stringify(written));                                 // 1117
        if (!serverDoc.writtenByStubs[methodId])                                                            // 1118
          throw new Error("Doc " + JSON.stringify(written) +                                                // 1119
                          " not written by  method " + methodId);                                           // 1120
        delete serverDoc.writtenByStubs[methodId];                                                          // 1121
        if (_.isEmpty(serverDoc.writtenByStubs)) {                                                          // 1122
          // All methods whose stubs wrote this method have completed! We can                               // 1123
          // now copy the saved document to the database (reverting the stub's                              // 1124
          // change if the server did not write to this object, or applying the                             // 1125
          // server's writes if it did).                                                                    // 1126
                                                                                                            // 1127
          // This is a fake ddp 'replace' message.  It's just for talking between                           // 1128
          // livedata connections and minimongo.                                                            // 1129
          self._pushUpdate(updates, written.collection, {                                                   // 1130
            msg: 'replace',                                                                                 // 1131
            id: written.id,                                                                                 // 1132
            replace: serverDoc.document                                                                     // 1133
          });                                                                                               // 1134
          // Call all flush callbacks.                                                                      // 1135
          _.each(serverDoc.flushCallbacks, function (c) {                                                   // 1136
            c();                                                                                            // 1137
          });                                                                                               // 1138
                                                                                                            // 1139
          // Delete this completed serverDocument. Don't bother to GC empty                                 // 1140
          // objects inside self._serverDocuments, since there probably aren't                              // 1141
          // many collections and they'll be written repeatedly.                                            // 1142
          delete self._serverDocuments[written.collection][written.id];                                     // 1143
        }                                                                                                   // 1144
      });                                                                                                   // 1145
      delete self._documentsWrittenByStub[methodId];                                                        // 1146
                                                                                                            // 1147
      // We want to call the data-written callback, but we can't do so until all                            // 1148
      // currently buffered messages are flushed.                                                           // 1149
      var callbackInvoker = self._methodInvokers[methodId];                                                 // 1150
      if (!callbackInvoker)                                                                                 // 1151
        throw new Error("No callback invoker for method " + methodId);                                      // 1152
      self._runWhenAllServerDocsAreFlushed(                                                                 // 1153
        _.bind(callbackInvoker.dataVisible, callbackInvoker));                                              // 1154
    });                                                                                                     // 1155
  },                                                                                                        // 1156
                                                                                                            // 1157
  _process_ready: function (msg, updates) {                                                                 // 1158
    var self = this;                                                                                        // 1159
    // Process "sub ready" messages. "sub ready" messages don't take effect                                 // 1160
    // until all current server documents have been flushed to the local                                    // 1161
    // database. We can use a write fence to implement this.                                                // 1162
    _.each(msg.subs, function (subId) {                                                                     // 1163
      self._runWhenAllServerDocsAreFlushed(function () {                                                    // 1164
        var subRecord = self._subscriptions[subId];                                                         // 1165
        // Did we already unsubscribe?                                                                      // 1166
        if (!subRecord)                                                                                     // 1167
          return;                                                                                           // 1168
        // Did we already receive a ready message? (Oops!)                                                  // 1169
        if (subRecord.ready)                                                                                // 1170
          return;                                                                                           // 1171
        subRecord.readyCallback && subRecord.readyCallback();                                               // 1172
        subRecord.ready = true;                                                                             // 1173
        subRecord.readyDeps && subRecord.readyDeps.changed();                                               // 1174
      });                                                                                                   // 1175
    });                                                                                                     // 1176
  },                                                                                                        // 1177
                                                                                                            // 1178
  // Ensures that "f" will be called after all documents currently in                                       // 1179
  // _serverDocuments have been written to the local cache. f will not be called                            // 1180
  // if the connection is lost before then!                                                                 // 1181
  _runWhenAllServerDocsAreFlushed: function (f) {                                                           // 1182
    var self = this;                                                                                        // 1183
    var runFAfterUpdates = function () {                                                                    // 1184
      self._afterUpdateCallbacks.push(f);                                                                   // 1185
    };                                                                                                      // 1186
    var unflushedServerDocCount = 0;                                                                        // 1187
    var onServerDocFlush = function () {                                                                    // 1188
      --unflushedServerDocCount;                                                                            // 1189
      if (unflushedServerDocCount === 0) {                                                                  // 1190
        // This was the last doc to flush! Arrange to run f after the updates                               // 1191
        // have been applied.                                                                               // 1192
        runFAfterUpdates();                                                                                 // 1193
      }                                                                                                     // 1194
    };                                                                                                      // 1195
    _.each(self._serverDocuments, function (collectionDocs) {                                               // 1196
      _.each(collectionDocs, function (serverDoc) {                                                         // 1197
        var writtenByStubForAMethodWithSentMessage = _.any(                                                 // 1198
          serverDoc.writtenByStubs, function (dummy, methodId) {                                            // 1199
            var invoker = self._methodInvokers[methodId];                                                   // 1200
            return invoker && invoker.sentMessage;                                                          // 1201
          });                                                                                               // 1202
        if (writtenByStubForAMethodWithSentMessage) {                                                       // 1203
          ++unflushedServerDocCount;                                                                        // 1204
          serverDoc.flushCallbacks.push(onServerDocFlush);                                                  // 1205
        }                                                                                                   // 1206
      });                                                                                                   // 1207
    });                                                                                                     // 1208
    if (unflushedServerDocCount === 0) {                                                                    // 1209
      // There aren't any buffered docs --- we can call f as soon as the current                            // 1210
      // round of updates is applied!                                                                       // 1211
      runFAfterUpdates();                                                                                   // 1212
    }                                                                                                       // 1213
  },                                                                                                        // 1214
                                                                                                            // 1215
  _livedata_nosub: function (msg) {                                                                         // 1216
    var self = this;                                                                                        // 1217
                                                                                                            // 1218
    // First pass it through _livedata_data, which only uses it to help get                                 // 1219
    // towards quiescence.                                                                                  // 1220
    self._livedata_data(msg);                                                                               // 1221
                                                                                                            // 1222
    // Do the rest of our processing immediately, with no                                                   // 1223
    // buffering-until-quiescence.                                                                          // 1224
                                                                                                            // 1225
    // we weren't subbed anyway, or we initiated the unsub.                                                 // 1226
    if (!_.has(self._subscriptions, msg.id))                                                                // 1227
      return;                                                                                               // 1228
    var errorCallback = self._subscriptions[msg.id].errorCallback;                                          // 1229
    delete self._subscriptions[msg.id];                                                                     // 1230
    if (errorCallback && msg.error) {                                                                       // 1231
      errorCallback(new Meteor.Error(                                                                       // 1232
        msg.error.error, msg.error.reason, msg.error.details));                                             // 1233
    }                                                                                                       // 1234
  },                                                                                                        // 1235
                                                                                                            // 1236
  _process_nosub: function () {                                                                             // 1237
    // This is called as part of the "buffer until quiescence" process, but                                 // 1238
    // nosub's effect is always immediate. It only goes in the buffer at all                                // 1239
    // because it's possible for a nosub to be the thing that triggers                                      // 1240
    // quiescence, if we were waiting for a sub to be revived and it dies                                   // 1241
    // instead.                                                                                             // 1242
  },                                                                                                        // 1243
                                                                                                            // 1244
  _livedata_result: function (msg) {                                                                        // 1245
    // id, result or error. error has error (code), reason, details                                         // 1246
                                                                                                            // 1247
    var self = this;                                                                                        // 1248
                                                                                                            // 1249
    // find the outstanding request                                                                         // 1250
    // should be O(1) in nearly all realistic use cases                                                     // 1251
    if (_.isEmpty(self._outstandingMethodBlocks)) {                                                         // 1252
      Meteor._debug("Received method result but no methods outstanding");                                   // 1253
      return;                                                                                               // 1254
    }                                                                                                       // 1255
    var currentMethodBlock = self._outstandingMethodBlocks[0].methods;                                      // 1256
    var m;                                                                                                  // 1257
    for (var i = 0; i < currentMethodBlock.length; i++) {                                                   // 1258
      m = currentMethodBlock[i];                                                                            // 1259
      if (m.methodId === msg.id)                                                                            // 1260
        break;                                                                                              // 1261
    }                                                                                                       // 1262
                                                                                                            // 1263
    if (!m) {                                                                                               // 1264
      Meteor._debug("Can't match method response to original method call", msg);                            // 1265
      return;                                                                                               // 1266
    }                                                                                                       // 1267
                                                                                                            // 1268
    // Remove from current method block. This may leave the block empty, but we                             // 1269
    // don't move on to the next block until the callback has been delivered, in                            // 1270
    // _outstandingMethodFinished.                                                                          // 1271
    currentMethodBlock.splice(i, 1);                                                                        // 1272
                                                                                                            // 1273
    if (_.has(msg, 'error')) {                                                                              // 1274
      m.receiveResult(new Meteor.Error(                                                                     // 1275
        msg.error.error, msg.error.reason,                                                                  // 1276
        msg.error.details));                                                                                // 1277
    } else {                                                                                                // 1278
      // msg.result may be undefined if the method didn't return a                                          // 1279
      // value                                                                                              // 1280
      m.receiveResult(undefined, msg.result);                                                               // 1281
    }                                                                                                       // 1282
  },                                                                                                        // 1283
                                                                                                            // 1284
  // Called by MethodInvoker after a method's callback is invoked.  If this was                             // 1285
  // the last outstanding method in the current block, runs the next block. If                              // 1286
  // there are no more methods, consider accepting a hot code push.                                         // 1287
  _outstandingMethodFinished: function () {                                                                 // 1288
    var self = this;                                                                                        // 1289
    if (self._anyMethodsAreOutstanding())                                                                   // 1290
      return;                                                                                               // 1291
                                                                                                            // 1292
    // No methods are outstanding. This should mean that the first block of                                 // 1293
    // methods is empty. (Or it might not exist, if this was a method that                                  // 1294
    // half-finished before disconnect/reconnect.)                                                          // 1295
    if (! _.isEmpty(self._outstandingMethodBlocks)) {                                                       // 1296
      var firstBlock = self._outstandingMethodBlocks.shift();                                               // 1297
      if (! _.isEmpty(firstBlock.methods))                                                                  // 1298
        throw new Error("No methods outstanding but nonempty block: " +                                     // 1299
                        JSON.stringify(firstBlock));                                                        // 1300
                                                                                                            // 1301
      // Send the outstanding methods now in the first block.                                               // 1302
      if (!_.isEmpty(self._outstandingMethodBlocks))                                                        // 1303
        self._sendOutstandingMethods();                                                                     // 1304
    }                                                                                                       // 1305
                                                                                                            // 1306
    // Maybe accept a hot code push.                                                                        // 1307
    self._maybeMigrate();                                                                                   // 1308
  },                                                                                                        // 1309
                                                                                                            // 1310
  // Sends messages for all the methods in the first block in                                               // 1311
  // _outstandingMethodBlocks.                                                                              // 1312
  _sendOutstandingMethods: function() {                                                                     // 1313
    var self = this;                                                                                        // 1314
    if (_.isEmpty(self._outstandingMethodBlocks))                                                           // 1315
      return;                                                                                               // 1316
    _.each(self._outstandingMethodBlocks[0].methods, function (m) {                                         // 1317
      m.sendMessage();                                                                                      // 1318
    });                                                                                                     // 1319
  },                                                                                                        // 1320
                                                                                                            // 1321
  _livedata_error: function (msg) {                                                                         // 1322
    Meteor._debug("Received error from server: ", msg.reason);                                              // 1323
    if (msg.offendingMessage)                                                                               // 1324
      Meteor._debug("For: ", msg.offendingMessage);                                                         // 1325
  },                                                                                                        // 1326
                                                                                                            // 1327
  _callOnReconnectAndSendAppropriateOutstandingMethods: function() {                                        // 1328
    var self = this;                                                                                        // 1329
    var oldOutstandingMethodBlocks = self._outstandingMethodBlocks;                                         // 1330
    self._outstandingMethodBlocks = [];                                                                     // 1331
                                                                                                            // 1332
    self.onReconnect();                                                                                     // 1333
                                                                                                            // 1334
    if (_.isEmpty(oldOutstandingMethodBlocks))                                                              // 1335
      return;                                                                                               // 1336
                                                                                                            // 1337
    // We have at least one block worth of old outstanding methods to try                                   // 1338
    // again. First: did onReconnect actually send anything? If not, we just                                // 1339
    // restore all outstanding methods and run the first block.                                             // 1340
    if (_.isEmpty(self._outstandingMethodBlocks)) {                                                         // 1341
      self._outstandingMethodBlocks = oldOutstandingMethodBlocks;                                           // 1342
      self._sendOutstandingMethods();                                                                       // 1343
      return;                                                                                               // 1344
    }                                                                                                       // 1345
                                                                                                            // 1346
    // OK, there are blocks on both sides. Special case: merge the last block of                            // 1347
    // the reconnect methods with the first block of the original methods, if                               // 1348
    // neither of them are "wait" blocks.                                                                   // 1349
    if (!_.last(self._outstandingMethodBlocks).wait &&                                                      // 1350
        !oldOutstandingMethodBlocks[0].wait) {                                                              // 1351
      _.each(oldOutstandingMethodBlocks[0].methods, function (m) {                                          // 1352
        _.last(self._outstandingMethodBlocks).methods.push(m);                                              // 1353
                                                                                                            // 1354
        // If this "last block" is also the first block, send the message.                                  // 1355
        if (self._outstandingMethodBlocks.length === 1)                                                     // 1356
          m.sendMessage();                                                                                  // 1357
      });                                                                                                   // 1358
                                                                                                            // 1359
      oldOutstandingMethodBlocks.shift();                                                                   // 1360
    }                                                                                                       // 1361
                                                                                                            // 1362
    // Now add the rest of the original blocks on.                                                          // 1363
    _.each(oldOutstandingMethodBlocks, function (block) {                                                   // 1364
      self._outstandingMethodBlocks.push(block);                                                            // 1365
    });                                                                                                     // 1366
  },                                                                                                        // 1367
                                                                                                            // 1368
  // We can accept a hot code push if there are no methods in flight.                                       // 1369
  _readyToMigrate: function() {                                                                             // 1370
    var self = this;                                                                                        // 1371
    return _.isEmpty(self._methodInvokers);                                                                 // 1372
  },                                                                                                        // 1373
                                                                                                            // 1374
  // If we were blocking a migration, see if it's now possible to continue.                                 // 1375
  // Call whenever the set of outstanding/blocked methods shrinks.                                          // 1376
  _maybeMigrate: function () {                                                                              // 1377
    var self = this;                                                                                        // 1378
    if (self._retryMigrate && self._readyToMigrate()) {                                                     // 1379
      self._retryMigrate();                                                                                 // 1380
      self._retryMigrate = null;                                                                            // 1381
    }                                                                                                       // 1382
  }                                                                                                         // 1383
});                                                                                                         // 1384
                                                                                                            // 1385
LivedataTest.Connection = Connection;                                                                       // 1386
                                                                                                            // 1387
// @param url {String} URL to Meteor app,                                                                   // 1388
//     e.g.:                                                                                                // 1389
//     "subdomain.meteor.com",                                                                              // 1390
//     "http://subdomain.meteor.com",                                                                       // 1391
//     "/",                                                                                                 // 1392
//     "ddp+sockjs://ddp--****-foo.meteor.com/sockjs"                                                       // 1393
//                                                                                                          // 1394
DDP.connect = function (url, _reloadOnUpdate) {                                                             // 1395
  var ret = new Connection(                                                                                 // 1396
    url, {reloadOnUpdate: _reloadOnUpdate});                                                                // 1397
  allConnections.push(ret); // hack. see below.                                                             // 1398
  return ret;                                                                                               // 1399
};                                                                                                          // 1400
                                                                                                            // 1401
// Hack for `spiderable` package: a way to see if the page is done                                          // 1402
// loading all the data it needs.                                                                           // 1403
//                                                                                                          // 1404
allConnections = [];                                                                                        // 1405
DDP._allSubscriptionsReady = function () {                                                                  // 1406
  return _.all(allConnections, function (conn) {                                                            // 1407
    return _.all(conn._subscriptions, function (sub) {                                                      // 1408
      return sub.ready;                                                                                     // 1409
    });                                                                                                     // 1410
  });                                                                                                       // 1411
};                                                                                                          // 1412
                                                                                                            // 1413
//////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

//////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                          //
// packages/livedata/server_convenience.js                                                                  //
//                                                                                                          //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                            //
// Only create a server if we are in an environment with a HTTP server                                      // 1
// (as opposed to, eg, a command-line tool).                                                                // 2
//                                                                                                          // 3
if (Package.webapp) {                                                                                       // 4
  if (process.env.DDP_DEFAULT_CONNECTION_URL) {                                                             // 5
    __meteor_runtime_config__.DDP_DEFAULT_CONNECTION_URL =                                                  // 6
      process.env.DDP_DEFAULT_CONNECTION_URL;                                                               // 7
  }                                                                                                         // 8
                                                                                                            // 9
  Meteor.server = new Server;                                                                               // 10
                                                                                                            // 11
  Meteor.refresh = function (notification) {                                                                // 12
    var fence = DDPServer._CurrentWriteFence.get();                                                         // 13
    if (fence) {                                                                                            // 14
      // Block the write fence until all of the invalidations have                                          // 15
      // landed.                                                                                            // 16
      var proxy_write = fence.beginWrite();                                                                 // 17
    }                                                                                                       // 18
    DDPServer._InvalidationCrossbar.fire(notification, function () {                                        // 19
      if (proxy_write)                                                                                      // 20
        proxy_write.committed();                                                                            // 21
    });                                                                                                     // 22
  };                                                                                                        // 23
                                                                                                            // 24
  // Proxy the public methods of Meteor.server so they can                                                  // 25
  // be called directly on Meteor.                                                                          // 26
  _.each(['publish', 'methods', 'call', 'apply'],                                                           // 27
         function (name) {                                                                                  // 28
           Meteor[name] = _.bind(Meteor.server[name], Meteor.server);                                       // 29
         });                                                                                                // 30
} else {                                                                                                    // 31
  // No server? Make these empty/no-ops.                                                                    // 32
  Meteor.server = null;                                                                                     // 33
  Meteor.refresh = function (notificatio) {                                                                 // 34
  };                                                                                                        // 35
}                                                                                                           // 36
                                                                                                            // 37
// Meteor.server used to be called Meteor.default_server. Provide                                           // 38
// backcompat as a courtesy even though it was never documented.                                            // 39
// XXX COMPAT WITH 0.6.4                                                                                    // 40
Meteor.default_server = Meteor.server;                                                                      // 41
                                                                                                            // 42
//////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);


/* Exports */
if (typeof Package === 'undefined') Package = {};
Package.livedata = {
  DDP: DDP,
  DDPServer: DDPServer,
  LivedataTest: LivedataTest
};

})();
