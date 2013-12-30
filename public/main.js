require.config({
	urlArgs : "bust=" + (new Date()).getTime(),
	paths : {
		jquery : "/script/lib/jquery",
		jqueryui : "/script/lib/jquery.ui",
		jqueryTable : "/script/lib/jquery.footable",
		jqueryTablePaging : "/script/lib/jquery.footable.paginate",
		chart : "/script/lib/highcharts",
		chartExport : "/script/lib/highcharts.export",
		ajax : "/script/extension/ajax",
		drawChart : "/script/extension/drawChart",
		manageTable : "/script/extension/manageTable",
		api : "/script/extension/api",
	},
	shim : {
		"jqueryui" : {
            deps : ["jquery"]
        },
        "jqueryTable" : {
            deps : ["jquery"]
        },
        "jqueryTablePaging" : {
            deps : ["jqueryTable"]
        },
        "chartExport" : {
            deps : ["chart"]
        }
	}
});

require(['jquery', 'jqueryui', 'api', 'drawChart', 'manageTable'], function ($, $ui, api, drawChart, manageTable) {
	
	var _private = {
		tableChartBlock : $("div#table-chart"),
		barChartBlock : $("div#bar-chart"),
		lineChartBlock : $("div#line-chart"),
		errorMesgBlock : $("div#error-mesg"),
		calculateAndFormat : function (rowDataArr) {
			var result = {};
			var count = 0;
			for (var datetime in rowDataArr) {
				var rowData = rowDataArr[datetime];
				
				// get item array
				var items = "";
				for (var domain in rowData) {
					items += "," + domain;
				}
				items = items.substring(1).split(",");
				
				// check different items
				if (count === 0) {
					result["item"] = items;
					result["means"] = {};
					result["table"] = {};
				} else {
					var temp = result["item"];
					for (var j = 0 ; j < items.length ; j++) {
						var exist = false;
						for (var i = 0 ; i < temp.length ; i++) {
							if (temp[i] === items[j]) {
								exist = true;
								break ;
							}
						}
						if (!exist) {
							temp.push(items[j]);
						}
					}
				}
				
				// calculate mean, get the min & max value
				var meanJson = {};
				var tableJson = {};
				for (var domain in rowData) {
					var benchmarkData = rowData[domain];
					var total = 0, minValue = (new Date().getTime()), maxValue = 0;
					for (var i = 0 ; i < benchmarkData.length ; i++) {
						var ttime = benchmarkData[i].total;
						total += ttime;
						
						if (ttime < minValue) {
							minValue = ttime;
						}
						
						if (ttime > maxValue) {
							maxValue = ttime;
						}
					}
					var meanValue = total / benchmarkData.length;
					meanJson[domain] = meanValue;
					tableJson[domain] = {
						'mean' : meanValue,
						'min' : minValue,
						'max' : maxValue
					};
				}
				result["means"][datetime] = meanJson;
				result["table"][datetime] = tableJson;
				count++;
			}
			
			return _private.formatter(result);			
		},
		formatter : function (calculate) {
			var items = calculate.item;
			var loopItem = [calculate.means, calculate.table];
			for (var j = 0 ; j < loopItem.length ; j++) {
				var dataItem = loopItem[j];
				for (var date in dataItem) {
					var dataset = dataItem[date];
					var dataArr = [];
					for (var i = 0 ; i < items.length ; i++) {
						var value = dataset[items[i]];
						if (value) {
							dataArr.push(value);
						} else {
							dataArr.push(0);
						}
					}
					dataItem[date] = dataArr;
				}
			}
			console.log(calculate);
			return calculate;
		},
		clearCharBlock : function () {
			_private.tableChartBlock.html("");
			_private.barChartBlock.html("");
			_private.lineChartBlock.html("");
		},
		getReportAndDrawCharts : function (values) {
			api.getReportByDatetime(
				{'datetimes' : values},
				function (resp) {
					var result = _private.calculateAndFormat(resp.response);
					drawChart.drawBar(_private.barChartBlock, result.item, result.means);
					drawChart.drawLine(_private.lineChartBlock, result.item, result.means);
					drawChart.drawTable(_private.tableChartBlock, result.item, result.table);
				}
			);
		},
		getReportDateOption : function () {
			api.getReportTimes(function (resp) {
				var dateSelect = $("#report-date");
				dateSelect.html("");
				var dateList = resp.response || [];
				for (var i = 0 ; i < dateList.length ; i++) {
					var date = dateList[i];
					$("<option/>").attr("value", date.utc).html(date.datetime).appendTo(dateSelect);
				}
			});
		}
	};
	
	// initial page
	$("div#benchmark-tabs").tabs();
	_private.getReportDateOption();
	
	// when select's option be selected, then draw charts
	$("select#report-date").change(function () {
		var values = [];
		$(this).find("option:selected").each(function () {
			values.push($(this).attr("value"));
		});
		_private.clearCharBlock();
		_private.getReportAndDrawCharts(values);
	});
	
	// do benchmark
    $('#benchmark-btn').click(function () {
    	var btn = $(this);
    	var oriValue = btn.attr("value");
    	btn.attr("disabled", "disabled").attr("value", "benchmarking....");
		api.benchmarkingNow(function () {
			btn.removeAttr("disabled").attr("value", oriValue);
			_private.getReportDateOption();
		});
	});
});