<?php
// reads files from specified path and returns them as an json-array
// takes one argument from GET variables, does not work without it
// the argument should come from http call to directories.php

// allow cross-origin requests
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");

if(isset($_GET['dir']) && isset($_GET['identifierKey'])){
  $directory = urldecode($_GET['dir']);
  $identifierKey = urldecode($_GET['identifierKey']);
  if(strlen($directory) == 8 && preg_match('/[[:digit:]]{8}/', $directory)){
    if(strlen($identifierKey) == 12 && preg_match('/[[:alnum:]]{12}/', $identifierKey)){
      
      $basedir = '../incoming/' . $identifierKey . '/' . $directory . '/';
      if ($directories = @scandir($basedir)){
        $result = array();
        $filesArray = array();
        foreach($directories as $bythehour){
          if($bythehour == '.' || $bythehour == '..'){
            continue;
          }
          $files = @scandir($dir = $basedir . $bythehour . '/converted/');
          if ($files && is_array($files)) {
            foreach ($files as $file) {
              if(!is_dir($entry = $dir . $file)){
                $entry = array();
                $entry['name'] = $file;
                $entry['path'] = str_replace("../", "", $dir) . $file;
                $filesArray[] = $entry;
              }
            }
          }
          $result['files_count'] = count($filesArray);
          $result['files'] = $filesArray;          
        }
        echo json_encode($result);
      }      
    }
  }
}
