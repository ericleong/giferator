function dropbox(element, playing, callback) {

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
		var files = dt.files;

		if (playing && playing.length > 0) {
			for (var i = 0; i < playing.length; i++) {
				clearTimeout(playing[i]);
			}
		}

		playing = play(element, files, callback);
	}

	element.addEventListener('dragenter', dragenter, false);
	element.addEventListener('dragover', dragover, false);
	element.addEventListener('drop', drop, false);
}