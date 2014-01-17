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
var commonDatetimeFormat = "YYYY/MM/DD HH:mm:ss";
var excelSubtitle = ["min", "max", "mean", "redirect", "ping ip", "ping time", "NSLookup"];
var rootDir = path.dirname(require.main.filename);
var exportFolder = rootDir + path.sep + 'export' + path.sep;
var reportFolder = rootDir + path.sep + 'report' + path.sep;
var moment = require('moment');
var util = require('util');
var xlsx = require('node-xlsx');

var getUrlDomain = function(site) {
	site = site.replace("http://", "");
	var slashIndex = site.indexOf("/");
	return site.substring(0, slashIndex);
};

var parsingByTime = function (executeTime) {
	executeTime = executeTime || "";
	var report = {};
	var folder = util.format(reportFolder + '%s' + path.sep, executeTime);
	var content = fs.readFileSync(folder + "location.txt").toString('utf8');
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
		reportsJson[moment.utc(parseInt(datetime)).format(commonDatetimeFormat)] = {
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

var checkSystemFolder = function () {
	if (! fs.existsSync(reportFolder)) {
		fs.mkdirSync(reportFolder);
	}
	if (! fs.existsSync(exportFolder)) {
		fs.mkdirSync(exportFolder);
	}
};

var getReportTimes = function () {
	checkSystemFolder();
	var dateList = [];
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
			'datetime' : moment.utc(datetime).format(commonDatetimeFormat)
		});
	}
	return dateList;
};

var exportExcel = function (timestamps) {
	checkSystemFolder();
	
	// do check timestamps
	var timesArr = timestamps.split(",");
	if (timesArr.length === 0) {
		return "";
	}
	
	// get site ordering
	var sitePath = rootDir + path.sep + 'site.txt';
	var siteOrdering = [];
	fs.readFileSync(sitePath).toString('utf8').split("\n").forEach(function(site) {
		site = site.trim();
		if (site !== "") {
			siteOrdering.push(site);
		}
	});
	
	// composite excel title table, and calculate ab min, max, mean value
	var inforPath = reportFolder + '%s' + path.sep + 'infor.txt';
	var firstRow = ["", ""];
	var secondRow = ["", "gzip"];
	var abReport = {};
	timesArr.forEach(function(time) {
		var infor = JSON.parse(fs.readFileSync(util.format(inforPath, time)).toString('utf8'));
		var title = infor.remark + '\r\n(' + moment.utc(parseInt(time)).format(commonDatetimeFormat) + ')';
		firstRow = firstRow.concat([title, "", "", "", "", "", ""]);
		secondRow = secondRow.concat(excelSubtitle);
		var abRowData = parsingByTime(time).list;
		var abMap = {};
		for (var key in abRowData) {
			var min = 999999, max = 0, sum = 0;
			var rowData = abRowData[key];
			for (var i = 0 ; i < rowData.length ; i++) {
				var total = parseInt(rowData[i].total);
				if (total < min) {
					min = total;
				}
				
				if (total > max) {
					max = total;
				}
				
				sum += total;
			}
			abMap[key] = {
				'min' : min,
				'max' : max,
				'mean' : (sum / rowData.length)
			};
		}
		abReport[time] = abMap;
	});
	
	// composite excel data table
	var dataRowArr = [];
	for (var i = 0 ; i < siteOrdering.length ; i++) {
		var site = siteOrdering[i];
		var domain = getUrlDomain(site);
		var rowData = [domain, ""];
		timesArr.forEach(function(time) {
			var followDirectMap = {};
			var md5Mapping = {};
			var locationPath = reportFolder + '%s' + path.sep + 'location.txt';
			var mappingPath = reportFolder + '%s' + path.sep + 'mapping.txt';
			var locationContent = fs.readFileSync(util.format(locationPath, time)).toString('utf8');
			locationContent.split("\n").forEach(function(location) {
				var directList = location.trim().split("|||");
				followDirectMap[directList[0]] = directList;
			});
			var mappingContent = fs.readFileSync(util.format(mappingPath, time)).toString('utf8');
			mappingContent.split("\n").forEach(function(mapping) {
				var mappingPair = mapping.trim().split(",");
				md5Mapping[mappingPair[0]] = mappingPair[1];
			});
			
			var ab = abReport[time][domain];
			if (ab === undefined || ab === null) {
				ab = {
					min : "",
					max : "",
					mean : ""
				};
			}
			
			var directData = undefined;
			var followDirect = followDirectMap[site];
			if (followDirect === undefined || followDirect === null) {
				directData = "";
			} else {
				directData = followDirect.join("\n");
			}
			
			rowData = rowData.concat([ab.min, ab.max, ab.mean, directData, "", "", ""]);
		});
		dataRowArr.push(rowData);
	}
	
	// export excel
	var filename = "report_" + (new Date().getTime()) + ".xlsx";
	var exportPath = exportFolder + filename;
	var data = ([firstRow, secondRow]).concat(dataRowArr);
	fs.appendFile(exportPath, xlsx.build({
		worksheets : [{
			"name" : "sheet_1",
			"data" : data
		}]
	}));
	
	return exportPath;
};

exports.parser = parser;
exports.getReportTimes = getReportTimes;
exports.exportExcel = exportExcel;