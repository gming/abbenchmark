var responseFormat = function (code, response) {
	return {
		'status' : code,
		'response' : response
	};
};

var exportJson = function (res, code, response) {
	response = response || {};
	res.json(200, responseFormat(code, response));
};

exports.json = exportJson;