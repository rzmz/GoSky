var _dirJSON = null;
var _filesJSON = null;
var _filesArray = null;
var _serverUrl = "http://gosky.rasmus.ee/";
var _isPlaying = false;
var _timeOut = 300; // in milliseconds
var _setInterval = null;
var _currentImageIndex = 0;
var $_image = null;
var $_slider = null;
var $_playButton = null;

Template.image.rendered = function(){
    $.getJSON(_serverUrl + "api/directories.php", function(result){
        _dirJSON = result;
        if(_dirJSON && _dirJSON.directories_count > 0){
            var dirArray = _dirJSON.directories;
            var dir = dirArray[dirArray.length - 1];
            $.getJSON(_serverUrl + "api/files.php?dir=" + dir.name, function(result){
                _filesJSON = result;
                if(_filesJSON && _filesJSON.files_count > 0){
                    _filesArray = _filesJSON.files;
                    changeImageSrc(_currentImageIndex);
                }
            });
        }
    });        
};

var getCurrentImageIndex = function(){
    console.log(_currentImageIndex);
    return _currentImageIndex;
}

var startPlaying = function(){
    _isPlaying = true;
    $_playButton.html($_playButton.data("stop"));
    _setInterval = Meteor.setInterval(changeImageSrc, _timeOut);    
}

var stopPlaying = function(){
    _isPlaying = false;
    $_playButton.html($_playButton.data("play"));
    Meteor.clearInterval(_setInterval);
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
    
    if(_isPlaying){
        $_slider.slider("option", "value", _currentImageIndex);
    }

    if(index){
        _currentImageIndex = index;
    }
    if(_filesArray !== null){
        if(!_filesArray[_currentImageIndex]){
            _currentImageIndex = 0;
        }
        $_image.attr("src", _serverUrl + _filesArray[_currentImageIndex].path);
    }
    _currentImageIndex += 1;
    if(_currentImageIndex === _filesArray.length){
        stopPlaying();
    }
};

Template.image.events({
    "click #playButton": function(e){
        $("#slider").slider();
        $_playButton = $(e.currentTarget);
        if(_isPlaying){
            stopPlaying();
        } else {
            startPlaying();
        }
    }
});    
