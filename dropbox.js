/* global play */
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

		if (dt) {

			if (dt.files && dt.files.length > 0) {

				stop(playing);

				playing = play(element, dt.files, blendMode, callback);
			} else {

				// split by 'http' because '\n' is not always there
				var links = dt.getData('text/uri-list').split('http');

				if (links && links.length > 0) {

					var validLinks = [];

					for (var i = 0; i < links.length; i++) {
						var link = links[i];

						if (link && link.length > 0 && link.indexOf('#') < 0) {
							
							// add the http back to the link
							validLinks.push('http' + link);
						}
					}

					if (validLinks.length > 0) {
						stop(playing);

						playing = play(element, validLinks, blendMode, callback);
					}
				}
			}
		}
	}

	element.addEventListener('dragenter', dragenter, false);
	element.addEventListener('dragover', dragover, false);
	element.addEventListener('drop', drop, false);
}

var choose = function(element, canvas, playing, blendMode, callback) {
	function update(e) {
		if (this && this.files && this.files.length > 0) {
			stop(playing);

			playing = play(canvas, this.files, blendMode, callback);
		}
	}

	element.addEventListener('change', update, false);
};

function stop(playing) {
	if (playing && playing.length > 0) {
		for (var i = 0; i < playing.length; i++) {
			clearTimeout(playing[i]);
		}
	}
}