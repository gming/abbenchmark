var util = require('util');
var fs = require('fs');
var path = require('path');
var os = require('os');
var rootDir = path.dirname(require.main.filename);
var apacheToolPathForLinux = '/usr/bin/ab';
var apacheToolPathForWin = rootDir + path.sep + 'bin' + path.sep + 'ab.exe';
var reportPath = rootDir + path.sep + 'report' + path.sep + '%s' + path.sep;
var reportSaveFile = reportPath + '%s.txt';
var errorSaveFile = reportPath + 'error.txt';
var inforSaveFile = reportPath + 'infor.txt';
var abcommand = ' -g ' + reportSaveFile + ' -v 4 -n 10 -c 1 %s ';
var fetchOK = 0;

var isNotEmptyString = function(value) {
	return (value !== undefined && value !== null && value !== "");
};

var getUrlDomain = function(site) {
	return site.replace("http://", "").replace("/", "");
};

var getCommand = function(executeTime, domain, site) {
	var abPath = "";
	var platform = os.platform().toLowerCase();
	if (platform === "linux") {
		abPath = apacheToolPathForLinux;
	} else {
		abPath = apacheToolPathForWin;
	}
	return util.format(abPath + abcommand, executeTime, domain, site);
};

var fetchBenchmarkData = function(executeTime, site) {
	var domain = getUrlDomain(site);
	var command = getCommand(executeTime, domain, site);
	var process = require('child_process');
	var childProcess = process.exec(command, function (error, stdout, stderr) {
		error = error || "";
		stderr = stderr || "";
		if (isNotEmptyString(error) || isNotEmptyString(stderr)) {
			var errorMesg = (new Date()) + "\n" + error + "\n==============================\n";
			var errorFile = util.format(errorSaveFile, executeTime);
			fs.appendFile(errorFile, new Buffer(errorMesg));
		}
		fetchOK++;
	});
	return childProcess;
};

var benchmarking = function (callback, param) {
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
		
		// save information txt
		fs.appendFile(util.format(inforSaveFile, executeTime), new Buffer(JSON.stringify({
			os : os.platform().toLowerCase(),
			remark : param.remark === null ? "" : param.remark
		})));
		
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