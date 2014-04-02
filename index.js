var child_process = require('child_process');
var FFmpeg = require('fluent-ffmpeg');
var util = require("util"),
    EventEmitter = require('events').EventEmitter;
var rimraf = require('rimraf');


function P2V(url, selector, options) {

    var defaults = {
        fps: 20,
        viewportSize: '1200x600'
    }

    this.url = url;
    this.selector = selector;
    this.options = util._extend(defaults, options || {});
    this._child = null;
    this.tmpDir = "";
}

util.inherits(P2V, EventEmitter);

P2V.prototype.start = function(cb) {
    this.on("video", function(videoPath) {
        if (cb && typeof(cb).toLowerCase() === "function") {
            cb(videoPath);
        }
    })
    this.callPage();
}

P2V.prototype.callPage = function() {

    var child = this._child = child_process.spawn(getCasperCommand(), this.getArgs());

    child.stdout.setEncoding('utf8');
    child.stdout.on("data", function(data) {
        if (data.indexOf("dir=") > -1) {
            this.tmpDir = data.substr(4).replace(/\s+$/, "");
            this.emit("paged", this.tmpDir);
            this.buildVideo();
        }
    }.bind(this));
    child.stderr.setEncoding('utf8');
    child.stderr.on("data", function(data) {
        console.error('child process errors: ' + code);
    })
    child.on('exit', function(code) {
        this._child = null;
        console.log('child process exited with code ' + code);
    }.bind(this));
};

P2V.prototype.buildVideo = function() {
    var tmpDir = this.tmpDir;
    var fps = this.options.fps;
    var videoPath = tmpDir + '/video.mp4';
    var patternCommand = FFmpeg({
        source: tmpDir + '/img%04d.jpg'
    }).addOption("-r", this.options.fps).withVideoCodec('libx264').saveToFile(videoPath);
    this.emit("video", videoPath);
    this.destroy();
};

P2V.prototype.destroy = function() {
    rimraf(this.tmpDir);
};

P2V.prototype.getArgs = function getArgs() {
    var args = ["lib/cli.js"];

    args.push("--url=" + this.url);
    if (this.selector) {
        args.push("--selector=" + this.selector);
    }

    if (this.options.tfs) {
        args.push("--tfs=" + this.options.tfs);
    }
    if (this.options.timeout) {
        args.push("--timeout=" + this.options.timeout);
    }
    if (this.options.viewportSize) {
        args.push("--viewportSize=" + this.options.viewportSize);
    }
    return args;
}

// module exports
module.exports = P2V;



// =========helpers ========

function getCasperCommand() {
    return "casperjs"
}