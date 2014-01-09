/**
  *  start		準備開始建立連線
  *  connect	已建立連線 (並進入等待狀態)
  *  endwrite	已送出 HTTP Request 指令
  *  beginread	已收到 HTTP Response 的第一個 byte
  *  done		完成 HTTP 要求並中斷連線
 **/
var fs = require('fs');
var path = require('path');
var rootDir = path.dirname(require.main.filename);
var reportFolder = rootDir + path.sep + 'report' + path.sep;
var moment = require('moment');
var util = require('util');

var parsingByTime = function (executeTime) {
	executeTime = executeTime || "";
	var report = {};
	var folder = util.format(reportFolder + '%s' + path.sep, executeTime);
	var reportFileList = fs.readdirSync(folder) || [];
	reportFileList = reportFileList.filter(function (element) {
		element = element.replace(".txt", "");
		return element !== "infor" && element !== "error";
	});
	if (reportFileList.length > 0) {
		for (var i = 0 ; i < reportFileList.length ; i++) {
			var reportFile = reportFileList[i];
			var domain = reportFile.replace(".txt", "");
			var dataSet = fs.readFileSync(folder + reportFile).toString('utf8');
			var dataArr = dataSet.split("\n");
			var json = [];
			for (var j = 1 ; j < dataArr.length ; j++) {
				if (dataArr[j] === "") {
					continue ;
				}
				var data = dataArr[j].split("\t");
				json.push({
					'connect' : parseInt(data[2]),
					'processing' : parseInt(data[3]),
					'total' : parseInt(data[4]),
					'waiting' : parseInt(data[5])
				});
			}
			report[domain] = json;
		}
	}
	var infor = JSON.parse(fs.readFileSync(folder + "infor.txt").toString('utf8'));
	return {
		list : report,
		infor : infor
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
	return reportsJson;
};

var getReportTimes = function () {
	var dateList = [];
	var reportDateList = fs.readdirSync(reportFolder) || [];
	for (var i = 0 ; i < reportDateList.length ; i++) {
		var reportDate = reportDateList[i];
		var reportFiles = fs.readdirSync(util.format(reportFolder + '%s' + path.sep, reportDate));
		if (reportFiles.length === 0) {
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