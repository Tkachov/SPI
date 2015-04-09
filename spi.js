Sources = new Mongo.Collection("sources");

if (Meteor.isClient) {

	Template.main.helpers({
		sources : function() {
			return Sources.find({},{sort:{active:-1}})
		}
	})

	//Preload images, doesn't seem to work :s
	Template.body.created = function(){
		var r = [];
		var i = 0;
		["play.png","pause.png","next.png","previous.png","mute.png","unmute.png"].forEach(function(url){
			r[i] = new Image();
			r[i].src = url;
			i++
		})
	}



	Template.song.helpers({
		slidervalue : function() {
			//console.log(this.position,Date.now()-Template.parentData(1).lastupdatetime)
			//return (this.position+Date.now()-Template.parentData(1).lastupdatetime)/this.duration
			return (this.position/this.duration)
		},

		playing : function() {
			return this.state=="PLAYING"
		},

		muted : function() {
			return this.mute == 1
		},

		has_data : function() {
			return !!(this.album||this.title||this.artist)
		}
	})

	Template.song.events({
		"click button" : function(e,tmp) {
			Meteor.call(e.target.name,tmp.data._id)
		},

		"click img" : function(e,tmp) {
			Meteor.call(e.target.dataset.cmd,tmp.data._id)
		},

		"change input[type='range']" : function(e,tmp) {
			console.log(tmp)
			Meteor.call("pos",[tmp.data._id,e.target.value])
		}
	})
}

if (Meteor.isServer) {
	Meteor.startup(function () {

		function addSource(url,name) {
			Sources.insert({
				active: false,
				url: url,
				title: name,

			})
		}

		Sources.remove({})
		//Add sources here!
		//addSource("192.168.1.1:7777","Foobar's desktop")

		addSource("192.168.1.136:7777", "Tkachov");

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

	function updateSource(source) {
		HTTP.get(completeURL(source.url),undefined,function(err,res) {
			if(err) {
				//console.warn("Error connecting to "+(source.title||"unnamed source")+" at "+source.url)
				Sources.update(source._id, {
					$set : {
						active: false
					}
				})
			} else {
				var rawdata = res.content.split("\r\n")
				var data = {}


				rawdata.forEach(function(entry){
					var split = entry.split("=")
					if(split[0]!="")
					data[split[0].toLowerCase()]=split[1]
				})

				Sources.update(source._id,{
					$set : {
						music_data : data,
						active: true,
					}
				})
			}
		})
	}


	function sendCommand(source,command,value) {
		HTTP.get(completeURL(source.url,false,command,Math.floor(value)))
	}

	Meteor.methods({
		play : function(sourceID) {sendCommand(Sources.findOne(sourceID),"play")},
		pause : function(sourceID) {sendCommand(Sources.findOne(sourceID),"pause")},
		stop : function(sourceID) {sendCommand(Sources.findOne(sourceID),"stop")},
		next : function(sourceID) {sendCommand(Sources.findOne(sourceID),"next")},
		previous : function(sourceID) {sendCommand(Sources.findOne(sourceID),"previous")},
		shuffle : function(sourceID) {sendCommand(Sources.findOne(sourceID),"shuffle")},
		repeat : function(sourceID) {sendCommand(Sources.findOne(sourceID),"repeat")},
		mute : function(sourceID) {sendCommand(Sources.findOne(sourceID),"mute")},
		pos : function(args) {
			var source = Sources.findOne(args[0])
			sendCommand(source,"position",args[1]*source.music_data.duration)
		}
	})
}
