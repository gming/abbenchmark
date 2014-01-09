var express = require('express');
var app = express();
var http = require('http');
var path = require('path');
var benchmarker = require('./modules/benchmarker');
var status = require('./modules/status');
var response = require('./modules/response');
var reports = require('./modules/reports');

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// router api
app.get('/', function (req, res) {
	res.render('index');
});

app.post('/api/benchmarkingNow', function (req, res) {
	try {
		var remark = req.body.remark;
		benchmarker.startBenchmarking(function (executeTime) {
			executeTime = executeTime || "";
			if (executeTime !== "") {
				response.json(res, status.OK, reports.parser(executeTime));
			} else {
				response.json(res, status.NO_BENCHMARK_DATA);
			}
		}, {
			remark : remark
		});
	} catch (e) {
		response.json(res, status.BENCHMARK_OCCUR_ERROR);
	}
});

app.post('/api/getReportTimes', function (req, res) {
	response.json(res, status.OK, reports.getReportTimes());
});

app.post('/api/getReportByDatetime', function (req, res) {
	response.json(res, status.OK, reports.parser(req.body.datetimes));
});

// run server
http.createServer(app).listen(app.get('port'), function () {
	console.log('server listening on port ' + app.get('port'));
});

