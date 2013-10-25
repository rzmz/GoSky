<?php
// reads directories from specified path and returns them as an json-array
header("Content-Type: application/json");

if ($files = scandir($dir = '../incoming/')) {  
    $result = array();
    foreach ($files as $file) {
      if(is_dir($entry = $dir . $file) && $file != '.' && $file != '..'){
        $result['directories'][]['name'] = $file;
      }
    }
    echo json_encode($result);
}
