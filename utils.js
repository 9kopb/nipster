var http = require('https'),
fs = require('fs'),
path = require('path');

exports.getJSON = function(options, callback) {
	if (!callback) {
		callback = function() {}
	}
	http.get(options, function(res) {
		var data = '';
		res.on('data', function(d) {
			data += d;
		});
		res.on('end', function() {
			try {
				data = JSON.parse(data);
				callback(null, data);
			} catch(e) {
				console.log('Parse error (%s) for data: %s', e, data);
                console.log(e, data);
                callback(e);
			}
		});
	});
};

exports.loadJSON = function(file, callback) {
	if (!callback) {
		callback = function() {}
	}
	fs.readFile(file, function(err, data) {
		try {
			if (!err) {
				data = JSON.parse(data);
				callback(err, data);
			} else {
				callback(true);
			}
		} catch(e) {
			console.log('Parse error (%s) for data: %s', e, data);
			callback(true);
		}
	});
};

exports.saveJSON = function(file, data, callback) {
	if (!callback) {
		callback = function() {}
	}
	try  {
		fs.mkdir(path.dirname(file), '0755');
		data = JSON.stringify(data);
		fs.writeFile(file, data, function(err) {
			if (err) {
				console.log(err);
			}
			callback();
		});
	} catch(e) {
		console.log(e);
		callback();
	}
};

