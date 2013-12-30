var util = require('util');
var fs = require('fs');
var path = require('path');
var rootDir = path.dirname(require.main.filename);
var apacheToolPath = rootDir + path.sep + 'bin' + path.sep + 'ab.exe';
var reportPath = rootDir + path.sep + 'report' + path.sep + '%s' + path.sep;
var reportSaveFile = reportPath + '%s.txt';
var errorSaveFile = reportPath + 'error.txt';
var abcommand = apacheToolPath + ' -g ' + reportSaveFile + ' -v 4 -n 10 -c 1 %s ';
var fetchOK = 0;

var isNotEmptyString = function(value) {
	return (value !== undefined && value !== null && value !== "");
};

var getUrlDomain = function(site) {
	return site.replace("http://", "").replace("/", "");
};

var fetchBenchmarkData = function(executeTime, site) {
	var domain = getUrlDomain(site);
	var command = util.format(abcommand, executeTime, domain, site);
	var process = require('child_process');
	var childProcess = process.exec(command, function (error, stdout, stderr) {
		error = error || "";
		stderr = stderr || "";
		if (isNotEmptyString(error) || isNotEmptyString(stderr)) {
			var errorMesg = (new Date()) + "\n" + error + "\n==============================\n";
			fs.appendFile(errorSaveFile, new Buffer(errorMesg));
		}
		fetchOK++;
	});
	return childProcess;
};

var benchmarking = function (callback) {
	callback = callback || function(){};
	var content = fs.readFileSync(rootDir + path.sep + "site.txt").toString('utf8');
	var sites = content.split("\n");
	if (sites.length > 0) {
		var executeTime = (new Date()).getTime() + "";
		fs.mkdirSync(util.format(reportPath, executeTime));
		
		// open process run ab benchmark
		var processArr = [];
		for (var i = 0 ; i < sites.length ; i++) {
			processArr.push(fetchBenchmarkData(executeTime, sites[i]));
		}
		
		// interval check process execute success
		var maxTime = 5;
		var intervalId = setInterval(function () {
			if (sites.length <= fetchOK || maxTime === 0) {
				console.log("benchmarker ending");
				for (var i = 0 ; i < processArr.length ; i++) {
					processArr[i].kill();
				}
				fetchOK = 0;
				clearInterval(intervalId);
				callback(executeTime);
			} else {
				console.log("fetching....");
				maxTime--;
			}
		}, 3000);
	} else {
		console.log("benchmarker ending");
		callback('');
	}
};

exports.startBenchmarking = benchmarking;