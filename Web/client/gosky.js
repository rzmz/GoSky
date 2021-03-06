var _keysJSON = null;
var _dirJSON = null;
var _filesJSON = null;
var _filesArray = null;
var _serverUrl = "public/";
var _identifierKey = "";
var _isPlaying = false;
var _timeOut = 300; // in milliseconds
var _setInterval = null;
var _currentImageIndex = 0;
var $_image = null;
var $_slider = null;
var $_playButton = null;

var currentDir = function(dir){
    if(getParams().dir == dir) {
        return true;
    } else {
        return false;
    }
}

$(document).ready(function(){
    
    wireEvents();
    
    _identifierKey = getParams().identifierKey;
        
    // get all available identifierkeys from the server
    $.getJSON(_serverUrl + "api/keys.php", function(result){
        _keysJSON = result;
        if(_keysJSON && _keysJSON.keys_count > 0){

            var keysArray  = _keysJSON.keys;

            if(!_identifierKey){
                _identifierKey = keysArray[0].name;
            }

            var $keysDIV = $("#keysDIV");

            for(var i = 0; i < keysArray.length; i++){
                var l = document.createElement("a");
                var text = document.createTextNode(keysArray[i].name);
                l.href = "?identifierKey=" + keysArray[i].name;
                l.appendChild(text);
        
                if(_identifierKey === keysArray[i].name){
                    var bold = document.createElement("b");
                    bold.appendChild(l);
                    $keysDIV.append(bold);                    
                } else {
                    $keysDIV.append(l);
                }
                
                $keysDIV.append(document.createTextNode("\u00a0\u00a0\u00a0"));
                
            }    
            
            if(getParams().start){
                _currentImageIndex = parseInt(getParams().start);
            }    
            
            $.getJSON(_serverUrl + "api/directories.php?identifierKey=" + _identifierKey, function(result){
                _dirJSON = result;
                if(_dirJSON && _dirJSON.directories_count > 0){

                    var dirArray = _dirJSON.directories;
                    
                    var $dirsDIV = $("#directoriesDIV");
                    
                    var currentDir = getParams().dir;
                    
                    if(!currentDir){
                        currentDir = dirArray[0].name;
                    }
                    
                    for(var i = 0; i < dirArray.length; i++){
                        var l = document.createElement("a");
                        var text = document.createTextNode(dirArray[i].name);
                        l.href = "?identifierKey=" + _identifierKey + "&dir=" + dirArray[i].name;
                        l.appendChild(text);
        
                        if(currentDir === dirArray[i].name){
                            var bold = document.createElement("b");
                            bold.appendChild(l);
                            $dirsDIV.append(bold);                    
                        } else {
                            $dirsDIV.append(l);
                        }
                        
                        $dirsDIV.append(document.createTextNode("\u00a0\u00a0\u00a0"));
                        
                    }
                                                        
                    $.getJSON(_serverUrl + "api/files.php?identifierKey=" + _identifierKey + "&dir=" + currentDir, function(result){
                        _filesJSON = result;
                        if(_filesJSON && _filesJSON.files_count > 0){
                            _filesArray = _filesJSON.files;
                            changeImageSrc(_currentImageIndex);
                        }
                    });
                }
            });        
            
        }
    });

});

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
    _setInterval = setInterval(changeImageSrc, _timeOut);
}

var stopPlaying = function(){
    _isPlaying = false;
    setPlayButtonStatus("play");
    clearInterval(_setInterval);
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

var wireEvents = function() {
    
    $("#playButton").click(function(e){
        if(_isPlaying){
            stopPlaying();
        } else {
            startPlaying();
        }
    });

    $("#firstButton").click(function(e){
        _currentImageIndex = 0;
        changeImageSrc();
    });
    
    $("#previousTen").click(function(e){
        _currentImageIndex = _currentImageIndex - 10;
        changeImageSrc();
    });
    
    $("#previousButton").click(function(e){
        _currentImageIndex--;
        changeImageSrc();
    });
    
    $("#nextButton").click(function(e){
        _currentImageIndex++;
        changeImageSrc();
    });
    
    $("#nextTen").click(function(e){
        _currentImageIndex = _currentImageIndex + 10;
        changeImageSrc();
    });

    $("#lastButton").click(function(e){
        _currentImageIndex = _filesArray.length - 1;
        changeImageSrc();
    });
    
};
