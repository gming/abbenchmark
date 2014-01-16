var fs = require('fs');
var path = require('path');
var HTTP_OK_STATUS = 200;

var responseFormat = function (code, response) {
	return {
		'status' : code,
		'response' : response
	};
};

var exportJson = function (res, code, response) {
	response = response || {};
	res.json(HTTP_OK_STATUS, responseFormat(code, response));
};

var exportFile = function (res, header, excelPath) {
	res.writeHead(HTTP_OK_STATUS, header);
	fs.createReadStream(excelPath).pipe(res);
};

exports.json = exportJson;
exports.file = exportFile;