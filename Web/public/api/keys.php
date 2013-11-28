<?php
// reads identifierkeys from specified path and returns them as an json-array

// allow cross-origin requests
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");

$dir = "../incoming/";

if ($files = scandir($dir)) {
    $result = array();
    $keys = array();
    foreach ($files as $file) {
      if(is_dir($entry = $dir . $file) && $file != '.' && $file != '..'){
        $keys[]['name'] = $file;
      }
    }
    $result['keys_count'] = count($keys);
    $result['keys'] = $keys;
    echo json_encode($result);
}