function create(stack) {
	// var canvas = document.createElement('canvas');
	var canvas = document.getElementById('dj');

	// encoder
	var encoder = new GIF({
		workers: 2,
		quality: 2,
		workerScript: './js/gif.worker.js'
	});

	// initialize gifs
	var gifs = [];

	function initialize(gif) {
		var byteArray = new Uint8Array(gif);

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
			data: byteArray,
			buffer: buffer,
			reader: gr,
			player: glif,
			frame_num: 0,
			duration: duration
		};
	}

	var durations = [];
	var minWidth;

	for (var i = 0; i < stack.length; i++) {
		gifs[i] = initialize(stack[i]);
		durations[i] = gifs[i].duration;

		if (minWidth === undefined || gifs[i].reader.width < minWidth) {
			minWidth = gifs[i].reader.width;
		}
	}

	// prepare canvas
	canvas.width = minWidth;
	canvas.height = minWidth / 2;

	// render

	function render(gif) {
		gif.frame_num = gif.frame_num % gif.reader.numFrames();
		var frame_info = gif.reader.frameInfo(gif.frame_num);

		gif.player.updateTransparency(frame_info.transparent_index);
		gif.player.updatePalette(gif.data.subarray(frame_info.palette_offset, frame_info.palette_offset + 256 * 3), 256);

		if (gif.frame_num == 0) {
			gif.player.clear();
		}

		gif.reader.decodeAndGLIF(gif.frame_num, gif.player);
		gif.frame_num++;

		return frame_info.delay;
	}

	// loop

	var current = 0; // current time in milliseconds * 10

	while (current < lcms(durations)) {

		// render the next frame in each gif that needs to be updated

		var minDelta = null;
		var index;

		for (var i = 0; i < stack.length; i++) {
			if (gifs[i].next === undefined || gifs[i].next == current) {
				var delay = render(gifs[i]);
				gifs[i].next = current + delay;
			}

			var delta = gifs[i].next - current;

			if (minDelta == null || delta < minDelta) {
				minDelta = delta;
				index = i;
			}
		}

		// draw

		var context = canvas.getContext('2d');

		context.globalCompositeOperation = 'source-over';
		cover(context, gifs[0].buffer, canvas);

		context.globalCompositeOperation = 'screen';

		for (var i = 1; i < gifs.length; i++) {
			cover(context, gifs[i].buffer, canvas);
		}

		// add to encoder

		encoder.addFrame(canvas, {
			copy: true,
			delay: minDelta * 10
		});
		
		current += minDelta;
	}

	encoder.on('progress', function(progress) {

		var p = progress * 100;

		document.getElementById('progress').style.width = p + '%';
		document.getElementById('create_text').textContent = Math.ceil(p) + '%';
	})

	encoder.on('finished', function(blob) {
		window.open(URL.createObjectURL(blob));

		document.getElementById('progress').style.width = '0%';
		document.getElementById('create_text').textContent = 'Create GIF';
	});

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
}

var lcms = function(numbers) {
	var result = numbers[0];

	for (var n = 1; n < numbers.length; n++) {
		result = lcm(numbers[n], numbers[n - 1]);
	}

	return result;
}