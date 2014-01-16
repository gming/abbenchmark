define(["jquery"], function ($) {
	var _private = {
		// RESTFUL_DOMAIN : "http://mas1.cloudcamstor.com:8080/restful/api/",
		LOCAL_RESTFUL_DOMAIN : "http://127.0.0.1:3000/api/",
		GET_METHOD : "GET",
		POST_METHOD : "POST",
		getUrl : function (url) {
			return _private.LOCAL_RESTFUL_DOMAIN + url + "?" + (new Date().getTime());
		},
		getTextRequest : function (requestObj) {
			var request = "";
			for (var key in requestObj) {
				request += "&" + key + "=" + encodeURIComponent(requestObj[key]);
			}
			return request.substring(1);
		},
		getJsonRequest : function (requestObj) {
			return JSON.stringify(requestObj);
		},
		getErrorObj : function (status, message) {
			return {
				"error" : status,
				"message" : message
			};
		},
		getResponseObj : function (data) {
			if (typeof data === "object") {
				return data;
			} else {
				return $.parseJSON(data);
			}
		}
	};

	//
	return {
		getMethod : function (url, requestObj, callback) {
			$.ajax({
				url : _private.getUrl(url),
				type : _private.GET_METHOD,
				data : _private.getTextRequest(requestObj),
				dataType: "text",
				contentType : "application/x-www-form-urlencoded",
				success : function (data, textStatus, jqXHR) {
					if (textStatus === "success") {
						callback(_private.getResponseObj(data));
					} else {
						callback(_private.getErrorObj(textStatus, ""));
					}
				},
				error : function (jqXHR, textStatus, errorThrown) {
					callback(_private.getErrorObj(textStatus, errorThrown));
				}
			});
		},
		postMethod : function (url, requestObj, callback) {
			$.ajax({
				url : _private.getUrl(url),
				type : _private.POST_METHOD,
				data : _private.getJsonRequest(requestObj),
				dataType: "json",
				contentType : "application/json",
				success : function (data, textStatus, jqXHR) {
					if (textStatus === "success") {
						callback(_private.getResponseObj(data));
					} else {
						callback(_private.getErrorObj(textStatus, ""));
					}
				},
				error : function (jqXHR, textStatus, errorThrown) {
					callback(_private.getErrorObj(textStatus, errorThrown));
				}
			});
		},
		getUrl : function (url) {
			return _private.getUrl(url);
		}
	};
	
});