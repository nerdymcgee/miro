const VLCRENDERER_CONTRACTID = "@participatoryculture.org/dtv/vlc-renderer;1";
const VLCRENDERER_CLASSID = Components.ID("{F9F01D99-9D3B-4A69-BD5F-285FFD360079}");

var pybridge = Components.classes["@participatoryculture.org/dtv/pybridge;1"].
        getService(Components.interfaces.pcfIDTVPyBridge);
var jsbridge = Components.classes["@participatoryculture.org/dtv/jsbridge;1"].
        getService(Components.interfaces.pcfIDTVJSBridge);

function writelog(str) {
    Components.classes['@mozilla.org/consoleservice;1']
	.getService(Components.interfaces.nsIConsoleService)	
	.logStringMessage(str);
}

function VLCRenderer() { 
  this.scheduleUpdates = false;
}

VLCRenderer.prototype = {
  QueryInterface: function(iid) {
    if (iid.equals(Components.interfaces.pcfIDTVVLCRenderer) ||
      iid.equals(Components.interfaces.nsISupports))
      return this;
    throw Components.results.NS_ERROR_NO_INTERFACE;
  },

  init: function(window) {
    this.document = window.document;
    var videoBrowser = this.document.getElementById("mainDisplayVideo");
    this.vlc = videoBrowser.contentDocument.getElementById("video1");
    this.timer = Components.classes["@mozilla.org/timer;1"].
          createInstance(Components.interfaces.nsITimer);
  },

  updateVideoControls: function() {
    var elapsed = this.vlc.get_time();
    var len = this.vlc.get_length();
    if (len < 1) len = 1;
    if (elapsed < 0) elapsed = 0;
    if (elapsed > len) elapsed = len;
    var progressSlider = this.document.getElementById("progress-slider");
    if(!progressSlider.beingDragged) {
      jsbridge.setSliderText(elapsed);
      jsbridge.moveSlider(elapsed/len);
    }
    var pos = this.vlc.get_position();
    if(this.startedPlaying && pos < 0) {
        // hit the end of the playlist
        this.scheduleUpdates = false;
        pybridge.skip(1);
    } else if(pos >=0) {
      this.startedPlaying = true;
    }
    if(this.scheduleUpdates) {
        var callback = {
          notify: function(timer) { this.parent.updateVideoControls()}
        };
        callback.parent = this;
        this.timer.initWithCallback(callback, 500,
                  Components.interfaces.nsITimer.TYPE_ONE_SHOT);
      }
  },

  showPauseButton: function() {
    var playButton = this.document.getElementById("bottom-buttons-play");
    playButton.className = "bottom-buttons-pause";
    var playMenuItem = this.document.getElementById('menuitem-play');
    playMenuItem.label = "&main.menu.playback.pause;" 
  },

  showPlayButton: function() {
    var playButton = this.document.getElementById("bottom-buttons-play");
    playButton.className = "bottom-buttons-play";
    var playMenuItem = this.document.getElementById('menuitem-play');
    playMenuItem.label = "&main.menu.playback.play;" 
  },

  reset: function() {
    // We don't need these, and stops seem to cause problems, so I'm
    // commenting them out --NN
    // this.stop();
    // this.vlc.clear_playlist();
    this.showPlayButton();
  },

  canPlayURL: function(url) {
    return true;
  },

  selectURL: function(url) {
    // FIXME: This doesn't quite follow the interface since we shouldn't be
    // playing the item at this point.  However currently, all calls to
    // selectItem are followed immediately by play, so this doesn't matter.
    // Also, VLC seems to have problems with quickly stopping and playing.

    // It appears that clear_playlist() always leaves one item in
    // the playlist. This is the only way I could figure out to
    // actually clear it... -NN  
    this.stop();
    this.vlc.clear_playlist();
    this.vlc.add_item(url);
    this.vlc.play();
    this.vlc.next();
  },

  play: function() {
    if(!this.vlc.isplaying()) this.vlc.play();
    this.scheduleUpdates = true;
    this.startedPlaying = false;
    this.updateVideoControls();
    this.showPauseButton();
  },

  pause: function() {
    this.scheduleUpdates = false;
    this.vlc.pause();
    this.showPlayButton();
  },

  stop: function() {
    this.scheduleUpdates = false;
    this.vlc.stop();
    this.showPlayButton();
  },

  goToBeginningOfMovie: function() {
    this.vlc.seek(0, 0);
  },

  getDuration: function() {
    rv = this.vlc.get_length();
    return rv;
  },

  getCurrentTime: function() {
    rv = this.vlc.get_time();
    return rv;
  },

  setVolume: function(level) {
    this.vlc.set_volume(level*200);
  },

  goFullscreen: function() {
    this.vlc.fullscreen();
  },
};

var Module = {
  _classes: {
      VLCRenderer: {
          classID: VLCRENDERER_CLASSID,
          contractID: VLCRENDERER_CONTRACTID,
          className: "DTV VLC Renderer",
          factory: {
              createInstance: function(delegate, iid) {
                  if (delegate)
                      throw Components.results.NS_ERROR_NO_AGGREGATION;
                  return new VLCRenderer().QueryInterface(iid);
              }
          }
      }
  },

  registerSelf: function(compMgr, fileSpec, location, type) {
      var reg = compMgr.QueryInterface(
          Components.interfaces.nsIComponentRegistrar);

      for (var key in this._classes) {
          var c = this._classes[key];
          reg.registerFactoryLocation(c.classID, c.className, c.contractID,
                                      fileSpec, location, type);
      }
  },

  getClassObject: function(compMgr, cid, iid) {
      if (!iid.equals(Components.interfaces.nsIFactory))
          throw Components.results.NS_ERROR_NO_INTERFACE;

      for (var key in this._classes) {
          var c = this._classes[key];
          if (cid.equals(c.classID))
              return c.factory;
      }

      throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
  },

  canUnload: function (aComponentManager) {
      return true;
  }
};

function NSGetModule(compMgr, fileSpec) {
  return Module;
}
