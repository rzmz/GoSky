var _dirJSON = null;
var _filesJSON = null;
var _filesArray = null;
var _serverUrl = "http://gosky.rasmus.ee/public/";
var _identifierKey = "";
var _isPlaying = false;
var _timeOut = 300; // in milliseconds
var _setInterval = null;
var _currentImageIndex = 0;
var $_image = null;
var $_slider = null;
var $_playButton = null;

Template.image.directories = function(){
    return Session.get("directories") || [];
}

Template.image.currentDir = function(dir){
    if(getParams().dir == dir) {
        return true;
    } else {
        return false;
    }
}

Template.image.identifierKey = function(){
    return Session.get("identifierKey");
}

Template.image.rendered = function(){
    
    _identifierKey = getParams().identifierKey;
    
    // todo: hardcoded Rasmus's identifierKey
    if(!_identifierKey){
        _identifierKey = "4afptz753wfi";
    }
    
    if(!_identifierKey){
        alert("Please supply identifierKey!");
    } else {
        Session.set("identifierKey", _identifierKey);
    }
    
    if(getParams().start){
        _currentImageIndex = parseInt(getParams().start);
    }
    
    if(getParams().dir){
        Session.set("dir", getParams().dir);
    }
    
    $.getJSON(_serverUrl + "api/directories.php?identifierKey=" + _identifierKey, function(result){
        _dirJSON = result;
        if(_dirJSON && _dirJSON.directories_count > 0){
            var dirArray = _dirJSON.directories;
            Session.set("directories", dirArray);
            
            var dir = dirArray[dirArray.length - 1].name;
                        
            if(Session.get("dir")){
                dir = Session.get("dir");
            }
            
            console.log(dir);
            
            $.getJSON(_serverUrl + "api/files.php?identifierKey=" + _identifierKey + "&dir=" + dir, function(result){
                _filesJSON = result;
                if(_filesJSON && _filesJSON.files_count > 0){
                    _filesArray = _filesJSON.files;
                    changeImageSrc(_currentImageIndex);
                }
            });
        }
    });        
};

var _getParams = null;
var getParams = function(){
    if(_getParams === null){
        var prmstr = window.location.search.substr(1);
        var prmarr = prmstr.split ("&");
        _getParams = {};

        for ( var i = 0; i < prmarr.length; i++) {
            var tmparr = prmarr[i].split("=");
            _getParams[tmparr[0]] = tmparr[1];
        }
    }
    return _getParams;
}

var getCurrentImageIndex = function(){
    console.log(_currentImageIndex);
    return _currentImageIndex;
}

var startPlaying = function(){
    _isPlaying = true;
    setPlayButtonStatus("stop");
    _setInterval = Meteor.setInterval(changeImageSrc, _timeOut);    
}

var stopPlaying = function(){
    _isPlaying = false;
    setPlayButtonStatus("play");
    Meteor.clearInterval(_setInterval);
}

var setPlayButtonStatus = function(status){
    if($_playButton === null){
        $_playButton = $("#playButton");
    }
    $_playButton.html($_playButton.data(status));
}

var changeImageSrc = function(index){
    
    if(_filesArray === null){
        alert("no files to show!");
        stopPlaying();
        return;
    }
    
    if($_image === null){
        $_image = $("img#image");
    }
        
    if($_slider === null){
        $_slider = $("#slider");        
        $_slider.on("slidestop", function(event, ui){
            _currentImageIndex = ui.value;
            changeImageSrc();
        });
        $_slider.slider({
            min: 0,
            max: (_filesArray.length - 1)
        });
    }
    
    $_slider.slider("option", "value", _currentImageIndex);

    if(index){
        _currentImageIndex = index;
    }
    if(_filesArray !== null){
        if(_currentImageIndex < 0){
            _currentImageIndex = 0;
        } else if(!_filesArray[_currentImageIndex]){
            _currentImageIndex = _filesArray.length - 1;
        }
        $_image.attr("src", _serverUrl + _filesArray[_currentImageIndex].path);
    }
    
    if(_isPlaying){
        _currentImageIndex += 1;        
    }
    
    if(_currentImageIndex === _filesArray.length){
        stopPlaying();
        _currentImageIndex--;
    }
    
    updateStatusLabel();
};

$_currentPicLabel = null;
$_totalPicsLabel = null;
var updateStatusLabel = function(){
    if($_currentPicLabel === null){
        $_currentPicLabel = $("#currentPicLabel");
    }
    if($_totalPicsLabel === null){
        $_totalPicsLabel = $("#totalPicsLabel");
    }
    $_currentPicLabel.html(_currentImageIndex + 1);
    $_totalPicsLabel.html(_filesArray.length);
}

Template.image.events({
    "click #playButton": function(e){
        if(_isPlaying){
            stopPlaying();
        } else {
            startPlaying();
        }
    },

    "click #firstButton": function(e){
        _currentImageIndex = 0;
        changeImageSrc();
    },
    
    "click #previousTen": function(e){
        _currentImageIndex = _currentImageIndex - 10;
        changeImageSrc();
    },
    
    "click #previousButton": function(e){
        _currentImageIndex--;
        changeImageSrc();
    },
    
    "click #nextButton": function(e){
        _currentImageIndex++;
        changeImageSrc();
    },

    "click #nextTen": function(e){
        _currentImageIndex = _currentImageIndex + 10;
        changeImageSrc();
    },
    
    "click #lastButton": function(e){
        _currentImageIndex = _filesArray.length - 1;
        changeImageSrc();
    }
    
    
    
});    
