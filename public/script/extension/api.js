define(["ajax"], function (ajax) {
	
	var _private = {
		getArgument : function (argus) {
			var argLen = argus.length;
			if (argLen === 1) {
				return {
					'param' : {},
					'callback' : argus[0]
				};
			}
			if (argLen >= 2) {
				return {
					'param' : argus[0],
					'callback' : argus[1]
				};
			}
		},
		callRemoteServer : function (method, url, params) {
			var methodFunction = undefined;
			if (method.toLowerCase() === "get") {
				methodFunction = ajax.getMethod;
			} else {
				methodFunction = ajax.postMethod;
			}
			
			params = _private.getArgument(params);
			methodFunction.call(this, url, params.param, function (resp) {
				params.callback(resp);
			});
		}
	};
	
	return {
		benchmarkingNow : function () {
			_private.callRemoteServer('post', 'benchmarkingNow', arguments);
		},
		getReportTimes : function () {
			_private.callRemoteServer('post', 'getReportTimes', arguments);
		},
		getReportByDatetime : function () {
			_private.callRemoteServer('post', 'getReportByDatetime', arguments);
		}
	};
});