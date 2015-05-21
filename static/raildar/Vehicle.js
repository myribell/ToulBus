var statuses = {
    "green": "ok",
    "yellow": "delayed",
    "orange": "delayed",
    "red": "delayed",
    "black": 'cancelled'
};



var position_type = {
	1:"GPS théorique",
	0:"extrapolée"	
};

var Vehicle = function(mission){
	
	
	// ********************************* properties = num direction marque terminus 
	for(k in mission){
		this[k] = mission[k];
	}
	
	
	if(this.delay < -300 ){
		this.type="black";
	} else if(this.delay < 60 ){
		this.type="green";
	} else if(this.delay < 120 ){
		this.type="yellow";
	} else if(this.delay < 300 ){
		this.type="orange";
	} else {
		this.type="red";
	} 
	
	this.statusDelay = statuses[this.type]; 
	this.status = mission.status;
	

	
	// need to check this with more details
	this.lib_pos_type=position_type[this.realtime];
	this.human_last_check=(this.last_check)?moment(this.last_check).format("LLL"):"Inconnue";	
	//var minutes=parseInt(this.minutes_to_next_gare);
	var minutes = 0;
	this.human_time_to_next_gare=moment.duration(minutes,"minutes").humanize();
};

Vehicle.getTitle = function(vehicle){
	return vehicle.brand+" n°"+vehicle.num+" en direction de "+vehicle.terminus;
};

Vehicle.getPopup = function(vehicle){
	return HandlebarsUtil.render('train_popup',vehicle);
};

Vehicle.isVisible = function(vehicle){
	var b = TrainFilters.bounds;
	/*if(vehicle.lon > b._southWest.lon && vehicle.lon < b._northEast.lon){
		if(vehicle.lat > b._southWest.lat && vehicle.lat < b._northEast.lat){*/
			
			//si filtre est une regexp
			
			if(TrainFilters.num.length >0){
				console.log("test");
				var regexp=new RegExp(TrainFilters.num,"i");
				if( regexp.test(vehicle.num)){
					return true;
				}
			} else {
				/* Regler ça pour l'affichage */
				
				if(_.contains(TrainFilters.visible,vehicle.brand)){
					if(_.contains(TrainFilters.visible,vehicle.statusDelay)){
						return true;
					}
				}
			}
		/*}
	}*/
	return false; // return false; /!\
};



Vehicle.updateAngle = function(vehicle){
	if(vehicle.id in Missions.markers){
		var angle = (180+parseInt(vehicle.heading))%360;
//		var angleRad=angle/360*2*Math.PI;
//		var cosA=Math.cos(angleRad);
//                var cosAmirror=-cosA;
//		var sinA=Math.sin(angleRad);
//                var sinAmirror=-sinA
 		var marker=$(Missions.markers[vehicle.id]._icon.firstChild);
//		if (angle>90 && angle < 270 ) {
//                         marker.css({"transform":"matrix("+cosA+", "+sinA+", "+sinA+", "+(-cosA)+", 0, 0)","display":"block"});
//			//marker.css({"transform":"matrix("+(cosA)+", "+(sinA)+", "+(-sinA)+", "+(cosA)+", 0, 0)","display":"block"});
//
//                } else {
//			marker.css({"transform":"matrix("+cosA+", "+sinA+", "+(-sinA)+", "+cosA+", 0, 0)","display":"block"});
//		}
		marker.css({"transform":"rotate("+angle+"deg)","display":"block"});
		//marker.css({"transform":"rotateZ("+angle+"deg)","display":"block"});
	}
};

//Show, update hide a train marker
Vehicle.drawMarker = function(vehicle,forceUpdate){
	if(vehicle.id in Missions.markers){
		//update du marker visible
		if(forceUpdate){
			Missions.markers[vehicle.id].setLatLng(L.latLng(vehicle.lat,vehicle.lon));
			Missions.markers[vehicle.id].setIcon(Missions.icons[vehicle.type]);
			if(Missions.markers[vehicle.id].getPopup()){
				Missions.markers[vehicle.id].setPopupContent(Vehicle.getPopup(vehicle));
			}
			Vehicle.updateAngle(vehicle);
			Missions.markers[vehicle.id].update();
		}
	}else{
		//ajout du marker si visible
		Missions.markers[vehicle.id] = L.marker(L.latLng(vehicle.lat,vehicle.lon),{
			icon:Missions.icons[vehicle.type],
			title : Vehicle.getTitle(vehicle),
		}).addTo(map);
		var vehicle = vehicle;
		Missions.markers[vehicle.id].on('mouseover',function(){
			$("#mission_detail").html(Vehicle.getPopup(vehicle)).show();
			$("#mission_detail_help").hide();
		}).on('mouseout',function(){
			$("#mission_detail").html("").hide();	
			$("#mission_detail_help").show();
		}).on('click',function(){
			if(!Missions.markers[vehicle.id].getPopup()){
				Missions.markers[vehicle.id].bindPopup(Vehicle.getPopup(vehicle)).openPopup(); 
			}
		}).on('popupclose',function(){
			Missions.markers[vehicle.id].unbindPopup(); 
		}).on('remove',function(){
			delete(vehicle);
		});
		Vehicle.updateAngle(vehicle);
	}
};


