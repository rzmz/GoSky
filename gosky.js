if (Meteor.isClient) {
    
    var _dirJSON = null;
    var _filesJSON = null;
    var _filesArray = null;
    var _serverUrl = "http://gosky.rasmus.ee/";
    var _isPlaying = false;
    var _timeOut = 300; // in milliseconds
    var _setInterval = null;
    var _currentImageIndex = 0;
    var $_image = null;
    
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
    
    var changeImageSrc = function(index){
        if($_image === null){
            $_image = $("img#image");
        }
        if(index){
            _currentImageIndex = index;
        }
        if(_filesArray !== null){
            $_image.attr("src", _serverUrl + _filesArray[_currentImageIndex].path);
        }
        console.log(_currentImageIndex);
        _currentImageIndex += 1;
    };
    
    Template.image.events({
        "click #playButton": function(e){
            var $button = $(e.currentTarget);
            _isPlaying = !_isPlaying;
            if(_isPlaying){
                $button.html($button.data("stop"));
                _setInterval = Meteor.setInterval(changeImageSrc, _timeOut);
            } else {
                $button.html($button.data("play"));
                Meteor.clearInterval(_setInterval);
            }
        }
    });
}

if (Meteor.isServer) {
  Meteor.startup(function () {      
    // code to run on server at startup
  });
}
