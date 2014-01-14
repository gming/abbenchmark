define(["jquery", "chart", "chartExport"], function ($, chart, chartExport) {
	var _private = {
		formatToSeriesData : function (group, infor) {
			var series = [];
			for (var datetime in group) {
				series.push({
	                name: datetime + " " + JSON.stringify(infor[datetime]),
	                data: group[datetime]
	            });
			}
			return series;
		},
		getChartConfig : function (customJson) {
			var container = customJson.container;
			return {
	            chart: {
					renderTo: container.attr("id"),
	                type: customJson.chartType,
	                height: container.height(),
	                width: container.width()
	            },
	            title: {
	                text: 'Benchmark Average Connection Times (ms)'
	            },
	            xAxis: {
	                categories: customJson.items,
	                title: {
	                    text: 'Alexa Top 20 Wesite In Japan',
	                    y: 30
	                }
	            },
	            yAxis: {
	                min: 0,
	                title: {
	                    text: 'Average Connection Times (ms)'
	                },
	                labels: {
	                    overflow: 'justify'
	                }
	            },
	            tooltip: {
	                valueSuffix: ' ms'
	            },
	            plotOptions: {
	                bar: {
	                    dataLabels: {
	                        enabled: true
	                    }
	                }
	            },
	            legend: {
	                layout: 'vertical',
	                align: 'right',
	                verticalAlign: 'top',
	                y: 30,
	                floating: true,
	                borderWidth: 1,
	                backgroundColor: '#FFFFFF',
	                shadow: true
	            },
	            credits: {
	                enabled: false
	            },
	            series: customJson.seriesData
	        };
		},
		getTableLayout : function (yColumn, xColumn, values, infor) {
			var table = $("<table class='table-cahrt' />");
			var yCount = yColumn.length + 1;
			var subTitle = ["min", "max", "mean"];
			for (var i = 0 ; i < yCount ; i++) {
				if (i === 0) {
					// main title
					var titleTr = $("<tr />").appendTo(table);
					$("<td />").html("Test web site").attr("rowspan", 2).appendTo(titleTr);
					for (var j = 0 ; j < xColumn.length ; j++) {
						$("<td />").html(xColumn[j] + " " + JSON.stringify(infor[xColumn[j]])).attr("colspan", subTitle.length).appendTo(titleTr);
					}
					
					// sub title
					var subTitleTr = $("<tr />").appendTo(table)
					for (var j = 0 ; j < xColumn.length ; j++) {
						for (var k = 0 ; k < subTitle.length ; k++) {
							$("<td />").html(subTitle[k]).appendTo(subTitleTr);
						}
					}
				} else {
					// value 
					var tr = $("<tr />");
					$("<td />").html(yColumn[i - 1]).appendTo(tr);
					for (var j = 0 ; j < xColumn.length ; j++) {
						for (var k = 0 ; k < subTitle.length ; k++) {
							$("<td />").html(values[xColumn[j]][i - 1][subTitle[k]]).appendTo(tr);
						}
					}
					tr.appendTo(table);
					tr.hover(function () {
						$(this).css({
							background : "#CCCCCC"
						});
					}, function () {
						$(this).css({
							background : "#FFFFFF"
						});
					});
				}
				
			}
			return table;
		}
	};

	//
	return {
		drawBar : function (container, items, datagroup, infor) {
			var chart = new Highcharts.Chart(_private.getChartConfig({
				container : container,
				chartType : "column",
				items : items,
				seriesData : _private.formatToSeriesData(datagroup, infor)
			}));
		},
		drawLine : function (container, items, datagroup, infor) {
			var chart = new Highcharts.Chart(_private.getChartConfig({
				container : container,
				chartType : "line",
				items : items,
				seriesData : _private.formatToSeriesData(datagroup, infor)
			}));
		},
		drawTable : function (container, items, datagroup, infor) {
			var xKey = [];
			for (var datetime in datagroup) {
				xKey.push(datetime);
			}
			var table = _private.getTableLayout(items, xKey, datagroup, infor);
			table.appendTo(container);
		},
		drawMapping : function (container, items, md5) {
			var mapping = $("<table />").addClass("table-cahrt");
			for (var i = 0 ; i < items.length ; i++) {
				var tr = $("<tr />");
				tr.append($("<td />").html(md5[i]));
				tr.append($("<td />").html(items[i]));
				mapping.append(tr);
			}
			mapping.appendTo(container);
		}
	};
	
});