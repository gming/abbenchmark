/**
  *  start		準備開始建立連線
  *  connect	已建立連線 (並進入等待狀態)
  *  endwrite	已送出 HTTP Request 指令
  *  beginread	已收到 HTTP Response 的第一個 byte
  *  done		完成 HTTP 要求並中斷連線
 **/
var fs = require('fs');
var md5 = require('MD5');
var path = require('path');
var rootDir = path.dirname(require.main.filename);
var reportFolder = rootDir + path.sep + 'report' + path.sep;
var moment = require('moment');
var util = require('util');

var getUrlDomain = function(site) {
	site = site.replace("http://", "");
	var slashIndex = site.indexOf("/");
	return site.substring(0, slashIndex);
};

var parsingByTime = function (executeTime) {
	executeTime = executeTime || "";
	var report = {};
	var folder = util.format(reportFolder + '%s' + path.sep, executeTime);
	var content = fs.readFileSync(rootDir + path.sep + "location.txt").toString('utf8');
	content.split("\n").forEach(function (direction) {
		if (direction !== "") {
			var location = direction.split("|||");
			
			// get apache benchmark data
			var json = [];
			for (var i = 0 ; i < location.length ; i++) {
				var filename = md5(location[i]);
				var dataSet = fs.readFileSync(folder + filename + ".txt").toString('utf8');
				var dataArr = dataSet.split("\n");
				for (var j = 1 ; j < dataArr.length ; j++) {
					if (dataArr[j] === "") {
						continue ;
					}
					var data = dataArr[j].split("\t");
					if (i === 0) {
						json.push({
							'connect' : parseInt(data[2]),
							'processing' : parseInt(data[3]),
							'total' : parseInt(data[4]),
							'waiting' : parseInt(data[5])
						});
					} else {
						var obj = json[j - 1];
						obj.connect += parseInt(data[2]);
						obj.processing += parseInt(data[3]);
						obj.total += parseInt(data[4]);
						obj.waiting += parseInt(data[5]);
					}
				}
			}
			report[getUrlDomain(location[0])] = json;
		}
	});
	
	return {
		list : report,
		infor : JSON.parse(fs.readFileSync(folder + "infor.txt").toString('utf8'))
	};
};

var parser = function (executeTime) {
	if (executeTime instanceof Array) {
		executeTime = executeTime || [];
	} else {
		executeTime = [executeTime];
	}
	var reportsJson = {};
	for (var i = 0 ; i < executeTime.length ; i++) {
		var datetime = executeTime[i];
		var report = parsingByTime(datetime);
		reportsJson[moment.utc(parseInt(datetime)).format("YYYY/MM/DD HH:mm:ss")] = {
			report : report.list,
			infor : report.infor
		};
	}
	
	var ordering = [];
	var md5List = [];
	fs.readFileSync(rootDir + path.sep + "site.txt").toString('utf8').split("\r").forEach(function (element) {
		element = element.trim();
		if (element !== "") {
			ordering.push(getUrlDomain(element));
			md5List.push(md5(element));
		}
	});
	
	return {
		reportList : reportsJson,
		ordering : ordering,
		md5 : md5List
	};
};

var getReportTimes = function () {
	var dateList = [];
	var exist = fs.existsSync(reportFolder);
	if (! exist) {
		fs.mkdirSync(reportFolder);
	}
	var reportDateList = fs.readdirSync(reportFolder) || [];
	for (var i = 0 ; i < reportDateList.length ; i++) {
		var reportDate = reportDateList[i];
		var folderPath = util.format(reportFolder + '%s' + path.sep, reportDate);
		if (! fs.statSync(folderPath).isDirectory()) {
			continue ;
		}
		if (fs.readdirSync(folderPath).length === 0) {
			continue ;
		}
		var datetime = parseInt(reportDate);
		dateList.push({
			'utc' : datetime,
			'datetime' : moment.utc(datetime).format("YYYY/MM/DD HH:mm:ss")
		});
	}
	return dateList;
};

exports.parser = parser;
exports.getReportTimes = getReportTimes;