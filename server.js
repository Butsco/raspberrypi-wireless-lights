var ws281x = require('rpi-ws281x-native');
var http = require('http');
var url = require("url");
var gpio = require("gpio");
var gpio23 = gpio.export(23, {
	direction: "in",
	ready: function(){
	  console.log('ready');
	}
});
gpio23.on("change", function(val) {
  console.log(val)
});

var fs = require('fs');

var NUM_LEDS = 24,
    pixelData = new Uint32Array(NUM_LEDS);

var brightness = 128;

ws281x.init(NUM_LEDS);


var lightsOff = function () {
  for (var i = 0; i < NUM_LEDS; i++) {
    pixelData[i] = color(0, 0, 0);
  }
  ws281x.render(pixelData);
  ws281x.reset();
}

var signals = {
  'SIGINT': 2,
  'SIGTERM': 15
};

function shutdown(signal, value) {
  console.log('Stopped by ' + signal);
  lightsOff();
  process.nextTick(function () { process.exit(0); });
}

Object.keys(signals).forEach(function (signal) {
  process.on(signal, function () {
    shutdown(signal, signals[signal]);
  });
});


// MODES


var COLOR = 0;
var COLOR_WHEEL = 1;
var SEACOLOR = 2;
var OFF = 3;
var MODE = SEACOLOR;
var R = 0, G = 0, B = 0;



// =========== SERVER
var index = fs.readFileSync('index.html');

  http.createServer(function (req, res) {
  var u = url.parse(req.url, true);
  var path = u.pathname;
  var query = u.query;

  console.log(url.parse(req.url, true));
  
  if(path == "/") {

    MODE = OFF;
    brightness = 128;
  
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.end(index);
  
  } 

   else if(path == "/color") {
   
    R = query.r;
    G = query.g;
    B = query.b;
    brightness = query.brightness

    MODE = COLOR;

  }

}).listen(80);
console.log("Server listening on 80");


// =========== LIGHTS
var frame = 0;
setInterval(function () {

  frame++;

  if(MODE == COLOR) {

  for (var i = 0; i < NUM_LEDS; i++) {
    pixelData[i] = color(R,G,B);
  }

  } else if(MODE == COLOR_WHEEL) {

  for (var i = 0; i < NUM_LEDS; i++) {
    pixelData[i] = wheel(((i * 256 / NUM_LEDS) + frame) % 256);
  }
  frame = (frame + 1) % 256;

  }else if(MODE == SEACOLOR) {
  for (var i = 0; i < NUM_LEDS; i++) {
	if((i + frame) %5 == 0){    
		pixelData[i] = color(255,G,B);
		}
  }
  }
   
  ws281x.render(pixelData);
}, 1000 / 30);

console.log('Rainbow started. Press <ctrl>+C to exit.');

// generate rainbow colors accross 0-255 positions.
function wheel(pos) {

  pos = 255 - Math.floor(pos);

  if (pos < 85) { return color(255 - pos * 3, 0, pos * 3); }
  else if (pos < 170) { pos -= 85; return color(0, pos * 3, 255 - pos * 3); }
  else { pos -= 170; return color(pos * 3, 255 - pos * 3, 0); }

}

// generate integer from RGB value
function color(r, g, b) {

  r = r * brightness / 255;
  g = g * brightness / 255;
  b = b * brightness / 255;

  return ((r & 0xff) << 16) + ((g & 0xff) << 8) + (b & 0xff);
}
