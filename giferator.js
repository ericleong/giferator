function start() {
	var player = document.getElementById('dj');
	var stack = [];

	var loaded = function(results) {
		stack = results;
	};

	var playing = play(player, ['gif/sunrise.gif', 'gif/rainbow.gif'], loaded);

	dropbox(player, playing, loaded);

	document.getElementById('create').addEventListener('click', function() {
		if (stack) {
			create(stack);
		} else {
			console.err('No gifs to encode!');
		}
	}, false);
}

function play(canvas, items, callback) {
	var gifBuffer = [];
	var playing = [];

	async.map(items, parse, function(err, results) {

		var reader = [];
		var data = [];
		var minWidth;

		callback(results);

		for (var i = 0; i < results.length; i++) {

			data[i] = new Uint8Array(results[i]);

			reader[i] = new GifReader(data[i]);

			var buffer = document.createElement('canvas');

			buffer.width = reader[i].width;
			buffer.height = reader[i].height;

			gifBuffer[i] = buffer;

			if (minWidth === undefined || buffer.width < minWidth) {
				minWidth = buffer.width;
			}
		}

		if (canvas) {

			canvas.width = minWidth;
			canvas.height = minWidth / 2;

			for (var i = 0; i < results.length; i++) {

				gliffer(gifBuffer[i], reader[i], data[i], function() {
					mix(canvas, gifBuffer);
				}, (function(index) {
					return function(timeoutId) {
						playing[index] = timeoutId;
					}
				})(i));
			}
		}
	});

	return playing;
}

function mix(canvas, buffers) {

	var context = canvas.getContext('2d');

	if (buffers.length > 0) {

		cover(context, buffers[0], canvas);

		context.save();
		context.globalCompositeOperation = 'screen';

		for (var i = 1; i < buffers.length; i++) {
			cover(context, buffers[i], canvas);
		}

		context.restore();
	}
}

function cover(context, input, output) {

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
	if (item instanceof File) {

		var imageType = /^image\//;

		if (!imageType.test(item.type)) {
			callback('File is not image.');
		}

		var reader = new FileReader();
		reader.onload = (function(cb) { return function(e) { cb(null, e.target.result); }; })(callback);
		reader.readAsArrayBuffer(item);
	} else {
		download(item, callback);
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
	}

	oReq.open('GET', url, true);
	oReq.responseType = 'arraybuffer';
	oReq.send();
}

function gliffer(canvas, gr, byteArray, callback, update) {
	
	var glif = new GLIF(canvas);
	
	var frame_num = 0;
	var frame_info;

	function draw() {

		frame_num = frame_num % gr.numFrames();
		frame_info = gr.frameInfo(frame_num);

		glif.updateTransparency(frame_info.transparent_index);
		glif.updatePalette(byteArray.subarray(frame_info.palette_offset, frame_info.palette_offset + 256 * 3), 256);

		if (frame_num == 0) {
			glif.clear();
		}

		gr.decodeAndGLIF(frame_num, glif);
		frame_num++;

		callback();

		update(setTimeout(draw, frame_info.delay * 10));
	}

	if (glif.gl) {
		draw();
	}
}