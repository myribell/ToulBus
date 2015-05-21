var worker = this;

importScripts('./Train.js', './TrainFilters.js', '../spark-md5.min.js', '../moment.min.js', '../moment.fr.js', '../underscore-min.js');

moment.lang('fr');

var getJSON = function(url, _options) {
	var options  = {
		data : {},
		cache:true,
	};
	for(var k in _options){
		options[k] = _options[k];
	}
	
	if(options.cache == false){
		options.data['_'] = (new Date()).getTime();
	}
	
	for (k in options.data) {
		url += (url.indexOf("?") == -1) ? "?" : "&";
		url += encodeURIComponent(k);
		url += "=";
		url += encodeURIComponent(options.data[k]);
	}

	var req = new XMLHttpRequest(); 						// Création de la requete ajax
	try{
		req.open('GET', url, true); 						//lancement de la requete
		//req.responseType = "json";
		req.onreadystatechange = function(aEvt) { 			//onreadystatechange est un event sur l'état d'avancement de la requete
			if (req.readyState == 4) {						//quand le state est = 4 : Request finished and response is ready
				if (req.status == 200) {					// if - status: 200 -> OK | 404 -> Page not found
					if(typeof options.success == 'function'){							//si success on lance la fonction success de la fonction ajax passé en option
						options.success(JSON.parse(req.response),req.statusText,req); 	// StatusText: Returns a string that represents the status of the request in a friendly form.
					}
				} else {
					if(typeof options.error == 'function'){								// si error on lance la fonction error de la fonction ajax passé en option
						options.error(req.statusText,req,null);
					}
				}											// Fin if / else 
				if(typeof options.complete == 'function'){
					options.complete(req,req.statusText);
				}
			}
		};
		req.send(null);
	}catch(e){
		if(typeof options.error == 'function'){
			options.error(req.statusText, req,e);
		}
		//console.error(e);
	}
};
var Trains = {};
var lastCirculationMD5 = null;
var filtersUpdated = false;
var runningXHR = null;
var handlers = {
	update_filters : function(filters) {
		TrainFilters = filters;
		filtersUpdated = true;
	},

	// options.params : parametre de la requete ajax
	get_circulation : function(options) {
		
		console.log("show me that options"+options);
		if(runningXHR){
			runningXHR.abort();
		}
		var d = new Date();
		 getJSON("http://www.raildar.fr/json/get_circulation.json", {
			data : options.data,
			cache : false,
			error : function(jqXHR, textStatus, errorThrown) {
				worker.postMessage({
					type : "circulation_error",
					data : {
						'textStatus' : textStatus,
						'errorThrown' : errorThrown.toString()
					}
				});
			},
			success : function(data, textStatus, jqXHR) {
				//console.log("request : "+(new Date().getTime() - d.getTime())+'ms');
				//var d2 = new Date();
				var md5 = SparkMD5.hash(jqXHR.responseText);
				//console.log("md5 : "+(new Date().getTime() - d2.getTime())+'ms');
				if(md5 != lastCirculationMD5 || filtersUpdated) {
					lastCirculationMD5 = md5;
					filtersUpdated = false;
					var missions = [];
					var trains = {};
					var stats = {ttl:0};
					for(var i = 0; i< data.features.length; i++){
						var mission = new Train(data.features[i]); // ******** Nouveau train ici -> new Bus *************
						
						if(!(mission.status in stats)){
							//console.info("Nouveau type : ",mission.type);
							stats[mission.status] = 1;
						}else{
							stats[mission.status]  += 1;
						}
						if(!(mission.type in stats)){
							//console.info("Nouveau type : ",mission.type);
							stats[mission.type] = 1;
						}else{
							stats[mission.type]  += 1;
						}
						stats['ttl']  += 1;
						
						if(Train.isVisible(mission,TrainFilters) || 'id_mission' in options.data){
							missions.push(mission);
							trains[mission.id_mission] = true;
							delete(Trains[mission.id_mission]);
						}else{
							delete(mission);
						}
					}
					worker.postMessage({
						type : "circulation_success",
						data : {
							missions : missions,
							remove : Trains,
							stats : stats
						}
					});
					delete(Trains);
					Trains = trains;
					delete(stats);
				}else{
					//console.info("Nothing to update");
				}
			},
			complete : function(jqXHR, textStatus) {
				worker.postMessage({
					type : "circulation_complete",
					data : {textStatus : textStatus}
				});

			}
		});
	}
};
this.addEventListener('message', function(e) {
	if (e.data.cmd in handlers) {
		handlers[e.data.cmd](e.data.parameter);
	} else {
		//console.error("No handler defined for cmd " + e.cmd);
	}
}, false);