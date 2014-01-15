var util = require('util');
var md5 = require('MD5');
var fs = require('fs');
var path = require('path');
var os = require('os');
var requests = 100;
var rootDir = path.dirname(require.main.filename);
var abLinux = '/usr/bin/ab';
var abWin = rootDir + path.sep + 'bin' + path.sep + 'ab.exe';
var reportFolder = rootDir + path.sep + 'report' + path.sep + '%s' + path.sep;
var abFolder = reportFolder + 'ab' + path.sep;
var pingFolder = reportFolder + 'ping' + path.sep;
var nsFolder = reportFolder + 'ns' + path.sep;
var errorSaveFile = reportFolder + 'error.txt';
var inforSaveFile = reportFolder + 'infor.txt';
var abGParam = ' -g ' + reportFolder + '%s.txt';
var abCommonParam = ' -v 4 -n %s -c 1 %s ';
var pingCommand = 'ping %s -n ' + requests;
var nsLookupCommand = 'nslookup %s';
var fetchOK = 0;
var resCode200 = "LOG: Response code = ";
var resCodeNot200 = "WARNING: Response code not 2xx ";
var httpHeaderLocation = "Location: ";
var locationMap = {};

var isNotEmptyString = function(value) {
	return (value !== undefined && value !== null && value !== "");
};

var getUrlDomain = function(site) {
	site = site.replace("http://", "");
	var slashIndex = site.indexOf("/");
	return site.substring(0, slashIndex);
};

var formattingUrl = function(site) {
	site = site.trim();
	if (site.substring(site.length - 1) !== "/") {
		site = site + "/";
	}
	return site;
};

var writeLocation = function(data) {
	fs.appendFile(rootDir + path.sep + "location.txt", new Buffer(data + "\n"));
};

var writeMapping = function(location) {
	fs.appendFile(rootDir + path.sep + "mapping.txt", new Buffer(location + " , " + md5(location) + "\n"));
};

var checklocation = function (orisite, site) {
	var command = getCommand({
		requestCount : 1, 
		site : formattingUrl(site)
	});
	
	var process = require('child_process');
	var childProcess = process.exec(command, function (error, stdout, stderr) {
		var done = stdout.indexOf("..done");
		if (done !== -1) {
			var responseCode = 0;
			var resCode200_index = stdout.indexOf(resCode200);
			if (resCode200_index !== -1) {
				responseCode = stdout.substring(resCode200_index + resCode200.length, resCode200_index + resCode200.length + 3);
			} else {
				var resCodeNot200_index = stdout.indexOf(resCodeNot200);
				responseCode = stdout.substring(resCodeNot200_index + resCodeNot200.length, resCodeNot200_index + resCodeNot200.length + 5);
				responseCode = responseCode.replace("(", "").replace(")", "");
			}

			// 
			var arr = locationMap[orisite];
			if (!arr) {
				orisite = formattingUrl(orisite);
				locationMap[orisite] = [orisite];
				writeMapping(orisite);
			} else {
				site = formattingUrl(site);
				arr.push(site);
				writeMapping(site);
			}
			
			// deal with http response code
			if (responseCode === "200") {
				console.log("test end: " + orisite);
			} else if (responseCode.indexOf("3") === 0) {
				var locationIndex = stdout.indexOf(httpHeaderLocation);
				var newsite = stdout.substring(locationIndex + httpHeaderLocation.length).split("\n")[0];
				checklocation(orisite, newsite);
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
	var realCount = 0;
	var sites = content.split("\n");
	if (sites.length > 0) {
		fs.writeFileSync(rootDir + path.sep + "location.txt", new Buffer(""), "utf8");
		fs.writeFileSync(rootDir + path.sep + "mapping.txt", new Buffer(""), "utf8");
		sites.forEach(function (site) {
			if (site !== "") {
				realCount++;
				site = site.trim();
				checklocation(site, site);
			}
		});
	} else {
		throw "Please setup site.txt file.";
	}
	
	var intervalId = setInterval(function () {
		var keyCount = 0;
		for (var site in locationMap) {
			keyCount++;
		}
		if (realCount === keyCount) {
			for (var site in locationMap) {
				var arr = locationMap[site];
				var data = "", token = "|||";
				for (var i = 0 ; i < arr.length ; i++) {
					data += arr[i] + token;
				}
				writeLocation(data.substring(0, data.length - token.length));
			}
			clearInterval(intervalId);
		}
	}, 2000);
}

var getCommand = function(param, saveReport) {
	saveReport = saveReport || false
	var abPath = "";
	var platform = os.platform().toLowerCase();
	if (platform === "linux") {
		abPath = abLinux;
	} else {
		abPath = abWin;
	}
	if (saveReport) {
		return util.format(abPath + abGParam + abCommonParam, param.timestamp, md5(param.site), param.requestCount, param.site);
	} else {
		return util.format(abPath + abCommonParam, param.requestCount, param.site);
	}
};

var writeErrorMessage = function(error, stderr, timestamp) {
	error = error || "";
	stderr = stderr || "";
	if (isNotEmptyString(error) || isNotEmptyString(stderr)) {
		var errorMesg = (new Date()) + "\n" + error + "\n==============================\n";
		fs.appendFile(util.format(errorSaveFile, timestamp), new Buffer(errorMesg));
	}
}

var fetchABBenchmarkData = function(timestamp, site) {
	var command = getCommand({
		timestamp : timestamp, 
		requestCount : requests, 
		site : site
	}, true);
	var process = require('child_process');
	var childProcess = process.exec(command, function (error, stdout, stderr) {
		fs.appendFile(util.format(abFolder, timestamp) + md5(site) + '.txt', new Buffer(stdout));
		writeErrorMessage(error, stderr, timestamp);
		fetchOK++;
		childProcess.kill();
	});
};

var fetchPingData = function(timestamp, site) {
	var process = require('child_process');
	var childProcess = process.exec(util.format(pingCommand, getUrlDomain(site)), {encoding : 'utf8'}, function (error, stdout, stderr) {
		fs.appendFile(util.format(pingFolder, timestamp) + md5(site) + '.txt', new Buffer(stdout));
		childProcess.kill();
	});
};

var fetchNslookupData = function(timestamp, site) {
	var process = require('child_process');
	var childProcess = process.exec(util.format(nsLookupCommand, getUrlDomain(site)), function (error, stdout, stderr) {
		fs.appendFile(util.format(nsFolder, timestamp) + md5(site) + '.txt', new Buffer(stdout));
		childProcess.kill();
	});
};

var benchmarking = function (callback, param) {
	callback = callback || function(){};
	var content = fs.readFileSync(rootDir + path.sep + "location.txt").toString('utf8');
	var sites = content.split("\n");
	if (sites.length > 0) {
		var timestamp = (new Date()).getTime() + "";
		
		// mkdir report folder
		fs.mkdirSync(util.format(reportFolder, timestamp));
		fs.mkdirSync(util.format(pingFolder, timestamp));
		fs.mkdirSync(util.format(abFolder, timestamp));
		fs.mkdirSync(util.format(nsFolder, timestamp));
		
		// open process run ab benchmark
		var siteCount = 0;
		for (var i = 0 ; i < sites.length ; i++) {
			var site = sites[i];
			if (site !== "") {
				var list = site.split("|||");
				for (var j = 0 ; j < list.length ; j++) {
					siteCount++;
					var location = list[j];
					fetchABBenchmarkData(timestamp, location);
					fetchPingData(timestamp, location);
					fetchNslookupData(timestamp, location);
				}
			}
		}
		
		// save information txt
		fs.appendFile(util.format(inforSaveFile, timestamp), new Buffer(JSON.stringify({
			os : os.platform().toLowerCase(),
			remark : (param.remark === null ? "" : param.remark)
		})));
		
		// interval check process execute success
		var maxTime = 20;
		var intervalId = setInterval(function () {
			if (siteCount <= fetchOK || maxTime === 0) {
				console.log("benchmarker ending");
				fetchOK = 0;
				clearInterval(intervalId);
				callback(timestamp);
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