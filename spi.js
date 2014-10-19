Sources = new Mongo.Collection("sources");

if (Meteor.isClient) {

	Template.main.helpers({
		sources : function() {
			return Sources.find({},{sort:{active:-1}})
		}
	})

	Template.song.helpers({
		slidervalue : function() {
			return this.position/this.duration
		},
		
		playing : function() {
			return this.state=="PLAYING"
		},
		
		muted : function() {
			return this.mute == 1
		}
	})
	
	Template.song.events({
		"click button" : function(e,tmp) {
			Meteor.call(e.target.name,tmp.data._id)
		},
		
		"click img" : function(e,tmp) {
			Meteor.call(e.target.dataset.cmd,tmp.data._id)
		}
	})
}

if (Meteor.isServer) {
	Meteor.startup(function () {
		
		Sources.update({active:null},{$set : {active:false}},{multi: true})
		Meteor.setTimeout(mainloop,1000)
		Meteor.setTimeout(idleloop,200)
	});
	  
	function idleloop() {
		Sources.find({active:false}).forEach(function(source){
			updateSource(source)
		})
		
		Meteor.setTimeout(idleloop,10000)
	}
	
	function mainloop() {
		Sources.find({active:true}).forEach(function(source){
			updateSource(source)
		})
		
		Meteor.setTimeout(mainloop,200)
	}
	  
	function completeURL(url,https,command,value) {
		return "http"+(https?"s":"")+"://"+url+"/API/1/"+(command?command.toUpperCase():"")+(value?"/"+value:"")
	}
	/*
	function initupdateloop() {
		//Update data
		Sources.find().forEach(function(source){
			if(source.url) {
				updateSource(source)
			} else {
				console.log((source.title||"Unnamed source")+ " has no url")
			}
		})
	}
	
	function scheduleUpdate(source,nextupdate) {
		Meteor.setTimeout(function() {
			updateSource(Sources.findOne(source._id))
		},nextupdate-Date.now())
	}*/
	
	function updateSource(source) {
		HTTP.get(completeURL(source.url),undefined,function(err,res) {
			if(err) {
				console.warn("Error connecting to "+(source.title||"unnamed source")+" at "+source.url)
				Sources.update(source._id, {
					$set : {
						active: false
					}
				})
			} else {
				var rawdata = res.content.split("\r\n")
				var data = {}
				
				var nextupdate = Date.now()+(source.updateinterval||1000)
				
				rawdata.forEach(function(entry){
					var split = entry.split("=")
					if(split[0]!="")
					data[split[0].toLowerCase()]=split[1]
				}) 
				
				Sources.update(source._id,{
					$set : {
						music_data : data,
						active: true,
						lastupdatetime : Date.now()
					}
				})
			}
			//scheduleUpdate(source,nextupdate)
		}) 
	}
	
	
	function sendCommand(source,command,value) {
		HTTP.get(completeURL(source.url,false,command,value))
	}
	
	Meteor.methods({
		play : function(sourceID) {sendCommand(Sources.findOne(sourceID),"play")},
		pause : function(sourceID) {sendCommand(Sources.findOne(sourceID),"pause")},
		stop : function(sourceID) {sendCommand(Sources.findOne(sourceID),"stop")},
		next : function(sourceID) {sendCommand(Sources.findOne(sourceID),"next")},
		previous : function(sourceID) {sendCommand(Sources.findOne(sourceID),"previous")},
		shuffle : function(sourceID) {sendCommand(Sources.findOne(sourceID),"shuffle")},
		repeat : function(sourceID) {sendCommand(Sources.findOne(sourceID),"repeat")},
		mute : function(sourceID) {sendCommand(Sources.findOne(sourceID),"mute")}
	
	})
}
