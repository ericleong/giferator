function start() {
	var playing = play(document.getElementById('dj'), ['gif/sunrise.gif', 'gif/rainbow.gif']);

	dropbox(document.getElementById('dj'), playing);
}

function play(canvas, items) {
	var gifBuffer = [];
	var playing = [];

	async.map(items, parse, function(err, results) {

		for (var i = 0; i < results.length; i++) {

			var byteArray = new Uint8Array(results[i]);

			var gr = new GifReader(byteArray);

			var info = gr.frameInfo(0);
			var buffer = document.createElement('canvas');

			buffer.width = info.width;
			buffer.height = info.height;

			gifBuffer[i] = buffer;

			gliffer(buffer, gr, byteArray, function() {
				mix(canvas, gifBuffer);
			}, (function(index) {
				return function(timeoutId) {
					playing[index] = timeoutId;
				}
			})(i));
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