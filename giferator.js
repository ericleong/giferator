/* global viewer */
/* global GifReader */
/* global async */
function start() {
	var player = document.getElementById('player');
	var stack = [];

	var blendMode = function() {
		var blend = document.getElementById('blend');
		
		if (blend) {
			return blend.value;
		}
	}

	// save downloaded data
	var loaded = function(results) {
		stack = results;
	};

	var playing = play(player, ['gif/sunrise.gif', 'gif/rainbow.gif'], blendMode, loaded);
	
	droppick(player, document.getElementById('chooser'), function(items) {
		if (playing && playing.length > 0) {
			for (var i = 0; i < playing.length; i++) {
				clearTimeout(playing[i]);
			}
		}
		
		playing = play(player, items, blendMode, loaded);
	});

	var ratioPicker = document.getElementById('ratio');
	if (ratioPicker) {
		ratioPicker.addEventListener('change', function() {

			if (this.value) {
				var dimensions = this.value.split(':');

				if (dimensions.length == 2 && dimensions[0] > 0 && dimensions[1] > 0) {
					var ratio = dimensions[0] / dimensions[1];

					player.height = player.width / ratio;
				}
			}
		}, false);
	}

	var createButton = document.getElementById('create');
	if (createButton) {
		createButton.addEventListener('click', function() {

			var width = 0;
			var height = 0;

			if (player) {
				width = player.width;
				height = player.height;
			}

			if (stack && stack.length > 0) {
				create(stack, width, height, blendMode(), function(progress) {

					var p = progress * 100;

					document.getElementById('progress').style.width = p + '%';
					document.getElementById('create_text').textContent = Math.ceil(p) + '%';
				}, function(blob) {
					var anchor = document.createElement('a');
					anchor.setAttribute('href', URL.createObjectURL(blob));
					anchor.setAttribute('download', 'giferator.gif');
					anchor.click();

					document.getElementById('progress').style.width = '0%';
					document.getElementById('create_text').textContent = 'Create GIF';
				});
			} else {
				console.err('No gifs to encode!');
			}
		}, false);
	}
}

var play = function(canvas, items, blendMode, callback) {
	var gifBuffer = [];
	var playing = [];

	async.map(items, parse, function(err, results) {

		var reader = [];
		var minWidth;

		callback(results);

		for (var i = 0; i < results.length; i++) {

			if (results[i] instanceof ArrayBuffer) {
				reader[i] = new GifReader(new Uint8Array(results[i]));

				var buffer = document.createElement('canvas');

				buffer.width = reader[i].width;
				buffer.height = reader[i].height;

				gifBuffer[i] = buffer;

			} else if (results[i] instanceof HTMLImageElement) {

				gifBuffer[i] = results[i];
			}

			if (gifBuffer[i] && gifBuffer[i].width > 0) {
				if (minWidth === undefined || gifBuffer[i].width < minWidth) {
					minWidth = gifBuffer[i].width;
				}
			}
		}

		if (canvas && minWidth > 0) {

			var oldRatio = canvas.width / canvas.height;

			// workaround for object-fit: contain; bug in chromium/blink
			// https://code.google.com/p/chromium/issues/detail?id=467409
			if (Boolean(window.chrome)) {
				minWidth = 180;
			}

			canvas.width = minWidth;
			canvas.height = minWidth / oldRatio;

			results.forEach(function(result, i) {
				if (gifBuffer[i] && reader[i]) { // check existence of arguments

					var view = viewer(gifBuffer[i], reader[i], function(timeoutId) {
						playing[i] = timeoutId;
						
						mix(canvas, gifBuffer, blendMode());
					});
					
					playing[i] = view();
				} else {
					mix(canvas, gifBuffer);
				}
			});
		}
	});

	return playing;
}

function mix(canvas, buffers, blendMode) {

	var context = canvas.getContext('2d');

	if (buffers.length > 0) {
		
		context.clearRect(0, 0, canvas.width, canvas.height);

		cover(context, buffers[0], canvas);

		context.save();
		context.globalCompositeOperation = blendMode;

		for (var i = 1; i < buffers.length; i++) {
			cover(context, buffers[i], canvas);
		}

		context.restore();
	}
}

var cover = function(context, input, output) {

	var width, height;
	var inputRatio = input.width / input.height;
	var outputRatio = output.width / output.height;

	if (inputRatio >= outputRatio) { // wider
		width = inputRatio * output.height;
		height = output.height;

		context.drawImage(input, - (width - output.width) / 2, 0, width, height);
	} else { // taller
		width = output.width;
		height = output.width / inputRatio;

		context.drawImage(input, 0, - (height - output.height) / 2, width, height);
	}
}

function parse(item, callback) {

	if (item instanceof ArrayBuffer || item instanceof HTMLImageElement) {

		callback(null, item);

	} else if (item instanceof File) {

		var imageType = /^image\//;

		if (!imageType.test(item.type)) {
			callback(item.name + ' is not an image.');
		}

		var gifType = /^image\/gif/;

		if (gifType.test(item.type)) {
			var reader = new FileReader();
			reader.onload = (function(cb) { return function(e) { cb(null, e.target.result); }; })(callback);
			reader.readAsArrayBuffer(item);
		} else {
			// not a gif but still an image
			var img = document.createElement('img');
			img.onload = function() {
				window.URL.revokeObjectURL(this.src);

				callback(null, this);
			};
			img.src = window.URL.createObjectURL(item);
		}
	} else {
		if (item.length && item.lastIndexOf && (item.lastIndexOf('.jpg') == item.length - 4 || item.lastIndexOf('.png') == item.length - 4)) {

			// if it seems like a static image, load it like an image.
			var img = document.createElement('img');
			img.onload = function() {
				callback(null, this);
			};
			img.src = item;
		} else {
			download(item, callback);
		}
	}
}

function download(url, callback) {
	var oReq = new XMLHttpRequest();

	oReq.onload = function(e) {
		var arrayBuffer = oReq.response; // not responseText

		if (arrayBuffer) {
			callback(null, arrayBuffer);
		} else {
			callback('No response.');
		}
	};

	oReq.onerror = function() {
		console.error('Could not load file from ' + url);
	};

	oReq.open('GET', url, true);
	oReq.responseType = 'arraybuffer';
	oReq.send();
}