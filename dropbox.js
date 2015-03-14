function dropbox(element, playing, blendMode, callback) {

	function dragenter(e) {
		e.stopPropagation();
		e.preventDefault();
	}

	function dragover(e) {
		e.stopPropagation();
		e.preventDefault();
	}

	function drop(e) {
		e.stopPropagation();
		e.preventDefault();

		var dt = e.dataTransfer;

		if (dt && dt.files) {
			stop(playing);

			playing = play(element, dt.files, blendMode, callback);
		}
	}

	element.addEventListener('dragenter', dragenter, false);
	element.addEventListener('dragover', dragover, false);
	element.addEventListener('drop', drop, false);
}

function choose(element, canvas, playing, blendMode, callback) {
	function update(e) {
		if (this && this.files && this.files.length > 0) {
			stop(playing);

			playing = play(canvas, this.files, blendMode, callback);
		}
	}

	element.addEventListener('change', update, false);
}

function stop(playing) {
	if (playing && playing.length > 0) {
		for (var i = 0; i < playing.length; i++) {
			clearTimeout(playing[i]);
		}
	}
}