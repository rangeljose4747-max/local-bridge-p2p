/*! webrtc-adapter @v7.4.0 | BSD-3-Clause | https://github.com/webrtcHacks/adapter */
(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.adapter = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
module.exports = function(module) {
    if (!module.webpackPolyfill) {
        module.deprecate = function() {};
        module.paths = [];
        if (!module.children) module.children = [];
        Object.defineProperty(module, "loaded", {
            enumerable: true,
            get: function() {
                return module.l;
            }
        });
        Object.defineProperty(module, "id", {
            enumerable: true,
            get: function() {
                return module.i;
            }
        });
        module.webpackPolyfill = 1;
    }
    return module;
};

},{}],2:[function(require,module,exports){
(function (global){(function (){
'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var browserDetails = void 0;

var shimError_ = void 0;

var log = function log() {
  var _console;

  (_console = console).log.apply(_console, arguments);
};

var defaultwindow = {
  RTCPeerConnection: function RTCPeerConnection() {},
  RTCSessionDescription: function RTCSessionDescription() {},
  RTCIceCandidate: function RTCIceCandidate() {},
  MediaStreamTrack: function MediaStreamTrack() {},
  navigator: {
    userAgent: '',
    mediaDevices: {
      getUserMedia: function getUserMedia() {},
      enumerateDevices: function enumerateDevices() {}
    }
  },
  location: {
    protocol: 'file:'
  }
};

var utils = {
  extractVersion: function extractVersion(uastring, expr, pos) {
    var match = uastring.match(expr);
    return match && match.length >= pos && parseInt(match[pos], 10);
  },
  disableLog: function disableLog(disable) {
    if (disable) {
      log = function log() {};
    }
  }
};

function merge() {
  for (var _len = arguments.length, objects = Array(_len), _key = 0; _key < _len; _key++) {
    objects[_key] = arguments[_key];
  }

  var target = {};
  objects.forEach(function (object) {
    Object.keys(object).forEach(function (key) {
      target[key] = object[key];
    });
  });
  return target;
}

var BrowserDetails = function () {
  function BrowserDetails(window) {
    _classCallCheck(this, BrowserDetails);

    this.browser = null;
    this.version = null;
    this.supported = false;

    if (typeof window === 'undefined') {
      window = defaultwindow;
    }

    var ua = window.navigator.userAgent;
    this.browser = this.detectBrowser(ua);
    this.version = this.detectVersion(ua, this.browser);
    this.supported = this.browser !== 'Not supported';
  }

  BrowserDetails.prototype.detectBrowser = function detectBrowser(ua) {
    if (ua.indexOf('Chrome') !== -1) {
      return 'chrome';
    } else if (ua.indexOf('Firefox') !== -1) {
      return 'firefox';
    } else if (ua.indexOf('Safari') !== -1) {
      return 'safari';
    } else if (ua.indexOf('Edge') !== -1) {
      return 'edge';
    } else if (ua.indexOf('MSIE') !== -1) {
      return 'ie';
    }
    return 'Not supported';
  };

  BrowserDetails.prototype.detectVersion = function detectVersion(ua, browser) {
    var version = 0;
    switch (browser) {
      case 'chrome':
        version = utils.extractVersion(ua, /Chrom(e|ium)\/([0-9]+)\./, 2);
        break;
      case 'firefox':
        version = utils.extractVersion(ua, /Firefox\/([0-9]+)\./, 1);
        break;
      case 'safari':
        version = utils.extractVersion(ua, /Version\/([0-9]+)\./, 1);
        break;
      case 'edge':
        version = utils.extractVersion(ua, /Edge\/([0-9]+)\./, 1);
        break;
      case 'ie':
        version = utils.extractVersion(ua, /MSIE ([0-9]+)/, 1);
        break;
    }
    return version;
  };

  return BrowserDetails;
}();

function shimGetUserMedia(window) {
  var navigator = window && window.navigator;

  if (!navigator || !navigator.mediaDevices) {
    return;
  }

  var constraintsToChrome_ = function constraintsToChrome_(c) {
    if ((typeof c === 'undefined' ? 'undefined' : _typeof(c)) !== 'object' || c.mandatory || c.optional) {
      return c;
    }
    var cc = {};
    Object.keys(c).forEach(function (key) {
      if (key === 'require' || key === 'advanced' || key === 'mediaSource') {
        return;
      }
      var r = _typeof(c[key]) === 'object' ? c[key] : { ideal: c[key] };
      if (r.exact !== undefined && typeof r.exact === 'number') {
        r.min = r.max = r.exact;
      }
      var oldname = function oldname(prefix, name) {
        if (prefix) {
          return prefix + name.charAt(0).toUpperCase() + name.slice(1);
        }
        return name === 'deviceId' ? 'sourceId' : name;
      };
      if (r.ideal !== undefined) {
        cc.optional = cc.optional || [];
        var oc = {};
        if (typeof r.ideal === 'number') {
          oc[oldname('min', key)] = r.ideal;
          cc.optional.push(oc);
          oc = {};
          oc[oldname('max', key)] = r.ideal;
          cc.optional.push(oc);
        } else {
          oc[oldname('', key)] = r.ideal;
          cc.optional.push(oc);
        }
      }
      if (r.exact !== undefined && typeof r.exact !== 'number') {
        cc.mandatory = cc.mandatory || {};
        cc.mandatory[oldname('', key)] = r.exact;
      } else {
        if (r.min !== undefined) {
          cc.mandatory = cc.mandatory || {};
          cc.mandatory[oldname('min', key)] = r.min;
        }
        if (r.max !== undefined) {
          cc.mandatory = cc.mandatory || {};
          cc.mandatory[oldname('max', key)] = r.max;
        }
      }
    });
    if (c.advanced) {
      cc.optional = (cc.optional || []).concat(c.advanced);
    }
    return cc;
  };

  var shimConstraints_ = function shimConstraints_(constraints, func) {
    if (browserDetails.browser === 'chrome' && constraints && constraints.audio) {
      constraints = merge(constraints, {
        audio: constraintsToChrome_(constraints.audio)
      });
    }
    return func(constraints);
  };

  var getUserMedia_ = function getUserMedia_(constraints, onSuccess, onError) {
    shimConstraints_(constraints, function (c) {
      navigator.mediaDevices.getUserMedia(c).then(onSuccess, onError);
    });
  };

  navigator.getUserMedia = getUserMedia_.bind(navigator);

  if (!navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices.getUserMedia = function (constraints) {
      return new Promise(function (resolve, reject) {
        getUserMedia_(constraints, resolve, reject);
      });
    };
  }
}

function shimGetDisplayMedia(window) {
  if (!window.navigator || !window.navigator.mediaDevices) {
    return;
  }

  if (window.navigator.mediaDevices.getDisplayMedia) {
    return;
  }

  window.navigator.mediaDevices.getDisplayMedia = function (constraints) {
    if (browserDetails.browser === 'chrome' && browserDetails.version >= 72) {
      return window.navigator.mediaDevices.getUserMedia(Object.assign({}, constraints, {
        video: Object.assign({}, constraints.video, {
          mediaSource: 'screen'
        })
      }));
    }
    return Promise.reject(new Error('getDisplayMedia not supported'));
  };
}

function shimOnTrack(window) {
  if (!window.RTCPeerConnection) {
    return;
  }
  if ('ontrack' in window.RTCPeerConnection.prototype) {
    return;
  }

  var origSetRemoteDescription = window.RTCPeerConnection.prototype.setRemoteDescription;
  window.RTCPeerConnection.prototype.setRemoteDescription = function () {
    var _this = this;

    if (!this._ontrackpoly) {
      this._ontrackpoly = [];
    }
    return origSetRemoteDescription.apply(this, arguments).then(function () {
      if (_this._ontrackpoly.length) {
        _this._ontrackpoly.forEach(function (poly) {
          var receiver = poly.receiver,
              track = poly.track,
              streams = poly.streams,
              transceiver = poly.transceiver;

          var event = new Event('track');
          event.track = track;
          event.receiver = receiver;
          event.transceiver = transceiver;
          event.streams = streams;
          _this.dispatchEvent(event);
        });
        _this._ontrackpoly = [];
      }
    });
  };

  var nativeAddTransceiver = window.RTCPeerConnection.prototype.addTransceiver;
  if (nativeAddTransceiver) {
    window.RTCPeerConnection.prototype.addTransceiver = function () {
      var transceiver = nativeAddTransceiver.apply(this, arguments);
      if (transceiver.receiver && transceiver.receiver.track && transceiver.sender) {
        var track = transceiver.receiver.track;
        var streams = [];
        var event = new Event('track');
        event.track = track;
        event.receiver = transceiver.receiver;
        event.transceiver = transceiver;
        event.streams = streams;
        this._ontrackpoly.push(event);
      }
      return transceiver;
    };
  }
}

function shimGetSendersWithDtmf(window) {
  if (!window.RTCPeerConnection) {
    return;
  }
  if ('getSenders' in window.RTCPeerConnection.prototype && 'insertDTMF' in window.RTCPeerConnection.prototype.getSenders()[0]) {
    return;
  }

  var origGetSenders = window.RTCPeerConnection.prototype.getSenders;
  if (origGetSenders) {
    window.RTCPeerConnection.prototype.getSenders = function () {
      var senders = origGetSenders.apply(this, arguments);
      senders.forEach(function (sender) {
        if (sender._shimmedDtmf) {
          return;
        }
        sender._shimmedDtmf = true;
        if (sender.track && sender.track.kind === 'audio' && sender.dtmf) {
          sender.insertDTMF = sender.dtmf.insertDTMF.bind(sender.dtmf);
        }
      });
      return senders;
    };
  }
}

function shimRTCIceCandidate(window) {
  if (!window.RTCIceCandidate) {
    return;
  }

  var nativeRTCIceCandidate = window.RTCIceCandidate;
  window.RTCIceCandidate = function RTCIceCandidate(args) {
    if (args && args.candidate && args.candidate.length > 0) {
      var candidate = args.candidate;
      if (candidate.indexOf('a=') === 0) {
        candidate = candidate.substr(2);
      }
      var fields = candidate.split(' ');
      if (fields.length < 10) {
        return new nativeRTCIceCandidate(args);
      }
      args.candidate = fields.slice(8).join(' ');
      args.sdpMid = fields[0];
      args.sdpMLineIndex = Number(fields[1]);
      args.usernameFragment = fields[7];
    }
    return new nativeRTCIceCandidate(args);
  };
  window.RTCIceCandidate.prototype = nativeRTCIceCandidate.prototype;
}

function shimCreateOffer(window) {
  if (!window.RTCPeerConnection) {
    return;
  }
  var origCreateOffer = window.RTCPeerConnection.prototype.createOffer;
  window.RTCPeerConnection.prototype.createOffer = function () {
    var _this2 = this;

    var options = arguments[0];
    if (options && options.offerToReceiveAudio === false && options.offerToReceiveVideo === false) {
      return origCreateOffer.apply(this, arguments);
    }
    return origCreateOffer.apply(this, arguments).then(function (offer) {
      if (offer.type === 'offer' && offer.sdp) {
        offer.sdp = offer.sdp.replace(/\r\n/g, '\n').replace(/\n/g, '\r\n');
      }
      return offer;
    });
  };
}

function shimCreateAnswer(window) {
  if (!window.RTCPeerConnection) {
    return;
  }
  var origCreateAnswer = window.RTCPeerConnection.prototype.createAnswer;
  window.RTCPeerConnection.prototype.createAnswer = function () {
    var _this3 = this;

    return origCreateAnswer.apply(this, arguments).then(function (answer) {
      if (answer.type === 'answer' && answer.sdp) {
        answer.sdp = answer.sdp.replace(/\r\n/g, '\n').replace(/\n/g, '\r\n');
      }
      return answer;
    });
  };
}

function shimAddTrackRemoveTrack(window) {
  if (!window.RTCPeerConnection) {
    return;
  }

  var origAddTrack = window.RTCPeerConnection.prototype.addTrack;
  var origRemoveTrack = window.RTCPeerConnection.prototype.removeTrack;

  if (origAddTrack && origRemoveTrack) {
    return;
  }

  if (!origAddTrack) {
    window.RTCPeerConnection.prototype.addTrack = function (track) {
      var streams = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];

      var _this4 = this;

      if (this._senders === undefined) {
        this._senders = [];
      }

      var alreadyExists = this._senders.find(function (sender) {
        return sender.track === track;
      });
      if (alreadyExists) {
        throw new DOMException('Track already exists.', 'InvalidAccessError');
      }

      var sender = void 0;
      if (this._peerConnection) {
        sender = this._peerConnection.addTrack(track, streams);
      } else {
        sender = { track: track };
      }

      this._senders.push(sender);

      streams.forEach(function (stream) {
        if (_this4._streams === undefined) {
          _this4._streams = [];
        }
        if (_this4._streams.indexOf(stream) === -1) {
          _this4._streams.push(stream);
        }
      });

      return sender;
    };
  }

  if (!origRemoveTrack) {
    window.RTCPeerConnection.prototype.removeTrack = function (sender) {
      var _this5 = this;

      if (this._senders === undefined) {
        this._senders = [];
      }

      var index = this._senders.indexOf(sender);
      if (index === -1) {
        throw new DOMException('Sender not found.', 'NotFoundError');
      }

      this._senders.splice(index, 1);

      if (this._peerConnection) {
        this._peerConnection.removeTrack(sender);
      }

      this._streams = this._streams.filter(function (stream) {
        return stream.getTracks().find(function (track) {
          return _this5._senders.find(function (s) {
            return s.track === track;
          });
        });
      });
    };
  }
}

function shimPeerConnection(window) {
  if (!window.RTCPeerConnection) {
    window.RTCPeerConnection = function RTCPeerConnection(config) {
      var _this6 = this;

      this._peerConnection = new (window.mozRTCPeerConnection || window.webkitRTCPeerConnection)(config);
      this._senders = [];
      this._streams = [];

      Object.defineProperty(this, 'localDescription', {
        get: function get() {
          return _this6._peerConnection.localDescription;
        }
      });

      Object.defineProperty(this, 'remoteDescription', {
        get: function get() {
          return _this6._peerConnection.remoteDescription;
        }
      });

      Object.defineProperty(this, 'signalingState', {
        get: function get() {
          return _this6._peerConnection.signalingState;
        }
      });

      Object.defineProperty(this, 'iceConnectionState', {
        get: function get() {
          return _this6._peerConnection.iceConnectionState;
        }
      });

      Object.defineProperty(this, 'iceGatheringState', {
        get: function get() {
          return _this6._peerConnection.iceGatheringState;
        }
      });
    };

    window.RTCPeerConnection.prototype.createOffer = function () {
      var _this7 = this;

      return new Promise(function (resolve, reject) {
        _this7._peerConnection.createOffer(resolve, reject, arguments[0]);
      });
    };

    window.RTCPeerConnection.prototype.createAnswer = function () {
      var _this8 = this;

      return new Promise(function (resolve, reject) {
        _this8._peerConnection.createAnswer(resolve, reject, arguments[0]);
      });
    };

    window.RTCPeerConnection.prototype.setLocalDescription = function (description) {
      var _this9 = this;

      return new Promise(function (resolve, reject) {
        _this9._peerConnection.setLocalDescription(function () {
          resolve();
        }, reject, description);
      });
    };

    window.RTCPeerConnection.prototype.setRemoteDescription = function (description) {
      var _this10 = this;

      return new Promise(function (resolve, reject) {
        _this10._peerConnection.setRemoteDescription(function () {
          resolve();
        }, reject, description);
      });
    };

    window.RTCPeerConnection.prototype.addIceCandidate = function (candidate) {
      var _this11 = this;

      return new Promise(function (resolve, reject) {
        _this11._peerConnection.addIceCandidate(function () {
          resolve();
        }, reject, candidate);
      });
    };

    window.RTCPeerConnection.prototype.getStats = function () {
      var _this12 = this;

      return new Promise(function (resolve, reject) {
        _this12._peerConnection.getStats(resolve, reject);
      });
    };

    window.RTCPeerConnection.prototype.close = function () {
      this._peerConnection.close();
    };

    shimAddTrackRemoveTrack(window);
  }

  shimOnTrack(window);
  shimGetSendersWithDtmf(window);
  shimCreateOffer(window);
  shimCreateAnswer(window);
  shimRTCIceCandidate(window);
}

function shimMediaStream(window) {
  if (!window.MediaStream) {
    window.MediaStream = function MediaStream() {
      this.id = Math.random().toString(36).substr(2, 10);
      this._tracks = [];
    };

    window.MediaStream.prototype.getTracks = function () {
      return this._tracks.slice();
    };

    window.MediaStream.prototype.getAudioTracks = function () {
      return this._tracks.filter(function (track) {
        return track.kind === 'audio';
      });
    };

    window.MediaStream.prototype.getVideoTracks = function () {
      return this._tracks.filter(function (track) {
        return track.kind === 'video';
      });
    };

    window.MediaStream.prototype.addTrack = function (track) {
      this._tracks.push(track);
    };

    window.MediaStream.prototype.removeTrack = function (track) {
      var index = this._tracks.indexOf(track);
      if (index !== -1) {
        this._tracks.splice(index, 1);
      }
    };
  }
}

function attachMediaStream(element, stream) {
  if (element.srcObject !== undefined) {
    element.srcObject = stream;
  } else if (element.mozSrcObject !== undefined) {
    element.mozSrcObject = stream;
  } else if (element.src !== undefined) {
    element.src = URL.createObjectURL(stream);
  } else {
    console.error('Error attaching stream to element.');
  }
}

function reattachMediaStream(to, from) {
  if (to.srcObject !== undefined) {
    to.srcObject = from.srcObject;
  } else if (to.mozSrcObject !== undefined) {
    to.mozSrcObject = from.mozSrcObject;
  } else if (to.src !== undefined) {
    to.src = from.src;
  } else {
    console.error('Error reattaching stream to element.');
  }
}

var adapter = {
  browserDetails: browserDetails,
  shimGetUserMedia: shimGetUserMedia,
  shimGetDisplayMedia: shimGetDisplayMedia,
  shimPeerConnection: shimPeerConnection,
  shimMediaStream: shimMediaStream,
  attachMediaStream: attachMediaStream,
  reattachMediaStream: reattachMediaStream,
  disableLog: utils.disableLog
};

exports.default = adapter;
module.exports = exports.default;

}).call(this)}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],3:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _adapter = require('./adapter');

var _adapter2 = _interopRequireDefault(_adapter);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

_adapter2.default.browserDetails = require('./adapter').browserDetails;
_adapter2.default.shimGetUserMedia = require('./adapter').shimGetUserMedia;
_adapter2.default.shimGetDisplayMedia = require('./adapter').shimGetDisplayMedia;
_adapter2.default.shimPeerConnection = require('./adapter').shimPeerConnection;
_adapter2.default.shimMediaStream = require('./adapter').shimMediaStream;
_adapter2.default.attachMediaStream = require('./adapter').attachMediaStream;
_adapter2.default.reattachMediaStream = require('./adapter').reattachMediaStream;
_adapter2.default.disableLog = require('./adapter').disableLog;

exports.default = _adapter2.default;
module.exports = exports.default;

},{"./adapter":2}]},{},[3])(3)
});
