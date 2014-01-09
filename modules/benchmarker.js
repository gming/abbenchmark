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
var saveReportCommand = ' -g ' + reportSaveFile;
var abcommand =  ' -v 4 -n %s -c 1 %s ';
var fetchOK = 0;
var token_200 = "LOG: Response code = ";
var token_not_200 = "WARNING: Response code not 2xx ";
var token_location = "Location: ";

var isNotEmptyString = function(value) {
	return (value !== undefined && value !== null && value !== "");
};

var getUrlDomain = function(site) {
	return site.replace("http://", "").replace("/", "");
};

var checklocation = function (site) {
	var process = require('child_process');
	site = site.trim();
	if (site === "") {
		return ;
	}

	if (site.substring(site.length - 1) !== "/") {
		site = site + "/";
	}
	var command = getCommand({
		requestCount : 1, 
		site : site
	});
	
	var childProcess = process.exec(command, function (error, stdout, stderr) {
		fs.appendFile(rootDir + path.sep + "test.txt", new Buffer(stdout));
		var done = stdout.indexOf("..done");
		if (done !== -1) {
			var responseCode = 0;
			var token_200_index = stdout.indexOf(token_200);
			if (token_200_index !== -1) {
				responseCode = stdout.substring(token_200_index + token_200.length, token_200_index + token_200.length + 3);
			} else {
				var token_not_200_index = stdout.indexOf(token_not_200);
				responseCode = stdout.substring(token_not_200_index + token_not_200.length, token_not_200_index + token_not_200.length + 5);responseCode = responseCode.replace("(", "").replace(")", "");
			}
			// deal with http response code
			if (responseCode === "200") {
				fs.appendFile(rootDir + path.sep + "location.txt", new Buffer(site + "\n"));
			} else if (responseCode.indexOf("3") === 0) {
				var locationIndex = stdout.indexOf(token_location);
				var newsite = stdout.substring(locationIndex + token_location.length).split("\n")[0];
				checklocation(newsite);
			} else {
				console.log("can't test: " + site, command);
			}
		} else {
			console.log("can't test: " + command);
		}
		childProcess.kill();
	});
};

var checkSiteList = function () {
	var content = fs.readFileSync(rootDir + path.sep + "site.txt").toString('utf8');
	var sites = content.split("\n");
	if (sites.length > 0) {
		fs.writeFileSync(rootDir + path.sep + "location.txt", new Buffer(""), "utf8");
		fs.writeFileSync(rootDir + path.sep + "test.txt", new Buffer(""), "utf8");
		for (var i = 0 ; i < sites.length ; i++) {
			var site = sites[i];
			checklocation(site);
		}
	} else {
		throw "Please setup site.txt file.";
	}
}

var getCommand = function(param, saveReport) {
	saveReport = saveReport || false
	var domain = getUrlDomain(param.site);
	var abPath = "";
	var platform = os.platform().toLowerCase();
	if (platform === "linux") {
		abPath = apacheToolPathForLinux;
	} else {
		abPath = apacheToolPathForWin;
	}
	if (saveReport) {
		return util.format(abPath + saveReportCommand + abcommand, param.executeTime, domain, param.requestCount, param.site);
	} else {
		return util.format(abPath + abcommand, param.requestCount, param.site);
	}
};

var fetchBenchmarkData = function(executeTime, site) {
	var command = getCommand({
		executeTime : executeTime, 
		requestCount : 10, 
		site : site
	}, true);
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
	var content = fs.readFileSync(rootDir + path.sep + "location.txt").toString('utf8');
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
exports.checkSiteList = checkSiteList;