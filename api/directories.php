<?php
// reads directories from specified path and returns them as an json-array

// allow cross-origin requests
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");

if ($files = scandir($dir = '../incoming/')) {  
    $result = array();
    $directories = array();
    foreach ($files as $file) {
      if(is_dir($entry = $dir . $file) && $file != '.' && $file != '..'){
        $directories[]['name'] = $file;
      }
    }
    $result['directories_count'] = count($directories);
    $result['directories'] = $directories;
    echo json_encode($result);
}
