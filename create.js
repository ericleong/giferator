/* global GIF */
/* global GLIF */
/* global GifReader */
/* global cover */
function create(stack, width, height, blendMode, progress, finish) {
	var canvas = document.createElement('canvas');
	var context = canvas.getContext('2d');

	// initialize gifs
	var gifs = [];

	function initialize(item) {

		if (item instanceof ArrayBuffer) {
			var byteArray = new Uint8Array(item);

			var gr = new GifReader(byteArray);

			var buffer = document.createElement('canvas');
			buffer.width = gr.width;
			buffer.height = gr.height;

			var glif = new GLIF(buffer);

			var duration = 0;
			for (var n = 0; n < gr.numFrames(); n++) {
				duration += gr.frameInfo(n).delay;
			}

			return {
				buffer: buffer,
				reader: gr,
				player: glif,
				frame_num: 0,
				duration: duration
			};
		} else if (item instanceof HTMLImageElement) {

			return {
				buffer: item,
				duration: 0
			};
		}
	}

	var durations = []; // ignore durations of zero
	var minWidth;

	for (var i = 0; i < stack.length; i++) {
		gifs[i] = initialize(stack[i]);

		if (gifs[i]) {
			if (gifs[i].duration > 0) {
				durations.push(gifs[i].duration);
			}

			if (minWidth === undefined || (gifs[i].buffer && gifs[i].buffer.width < minWidth)) {
				minWidth = gifs[i].buffer.width;
			}
		}
	}

	// prepare canvas
	if (width > 0 && height > 0) {
		if (Boolean(window.chrome)) {
			canvas.width = minWidth;
			canvas.height = minWidth / (width / height);
		} else {
			canvas.width = width;
			canvas.height = height;
		}
	} else {
		canvas.width = minWidth;
		canvas.height = minWidth; // default ratio of 1:1
	}

	// encoder
	var encoder = new GIF({
		workers: 2,
		quality: 2,
		width: canvas.width,
		height: canvas.height,
		background: '#fff',
		transparent: 0x000000,
		workerScript: './js/gif.worker.js'
	});

	// render

	function render(gif) {
		gif.frame_num = gif.frame_num % gif.reader.numFrames();
		var frame_info = gif.reader.frameInfo(gif.frame_num);

		if (gif.frame_num == 0) {
			gif.player.clear();
		}

		gif.reader.decodeAndGLIF(gif.frame_num, gif.player);
		gif.frame_num++;

		return frame_info.delay;
	}

	// loop

 	// time in milliseconds * 10
	var current = 0;
	var end = 0;

	if (durations.length > 0) {
		end = lcms(durations);
	} else {
		end = 1; // some number greater than zero
	}

	while (current < end) {

		// render the next frame in each gif that needs to be updated

		var minDelta = null;

		for (var i = 0; i < stack.length; i++) {

			if (gifs[i].next === undefined || gifs[i].next == current) {

				var delay = 0;

				if (gifs[i].reader) { // is gif
					delay = render(gifs[i]);
				}

				gifs[i].next = current + delay;
			}

			var delta = gifs[i].next - current;

			if (delta > 0 && (minDelta == null || delta < minDelta)) {
				minDelta = delta;
			}
		}

		// set min delta to zero if there is none
		minDelta = minDelta > 0 ? minDelta : 0;

		// draw
		context.clearRect(0, 0, canvas.width, canvas.height);
		cover(context, gifs[0].buffer, canvas);

		context.save();
		context.globalCompositeOperation = blendMode;

		for (var i = 1; i < gifs.length; i++) {
			cover(context, gifs[i].buffer, canvas);
		}
		
		context.restore();

		// add to encoder

		encoder.addFrame(canvas, {
			copy: true,
			delay: minDelta * 10
		});
		
		if (minDelta > 0) {
			current += minDelta;
		} else {
			// only happens for still images
			current = end;
		}
	}

	encoder.on('progress', progress);

	encoder.on('finished', finish);

	encoder.render();
}

// http://stackoverflow.com/questions/17445231/js-how-to-find-the-greatest-common-divisor
var gcd = function(a, b) {
    if (!b) {
        return a;
    }

    return gcd(b, a % b);
};

var lcm = function(a, b) {
	if (a == 0 && b == 0) {
		return 0;
	}

	return Math.abs(a * b) / gcd(a, b);
};

var lcms = function(numbers) {
	var result = numbers[0];

	for (var n = 1; n < numbers.length; n++) {
		result = lcm(numbers[n], numbers[n - 1]);
	}

	return result;
};