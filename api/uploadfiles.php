<?php
ob_start();
header('Content-Type: application/xml');

error_reporting(E_ALL);
date_default_timezone_set('Europe/Tallinn');

// function defination to convert array to xml
function array_to_xml($data, &$xml) {
    foreach($data as $key => $value) {
        if(is_array($value)) {
            if(!is_numeric($key)){
                $subnode = $xml->addChild("$key");
                array_to_xml($value, $subnode);
            }
            else{
                $subnode = $xml->addChild("item$key");
                array_to_xml($value, $subnode);
            }
        }
        else {
            $xml->addChild("$key", "$value");
        }
    }
}

$data = array();
$data['files'] = $_FILES;
$data['post'] = $_POST;
$data['datetime'] = date('Y-m-d H:i:s');
$data['ip'] = $_SERVER['REMOTE_ADDR'];
$data['result'] = "undefined";

if($_FILES && sizeof($_FILES) > 0){
  $target_path1 = "../incoming/" . date("Ymd") . "/";

  if(!file_exists($target_path1)){
    mkdir($target_path1);
  }
  
  $target_path2 = $target_path1 . "converted/";
  if(!file_exists($target_path2)){
    mkdir($target_path2);
  }
  
  $target_path1 = $target_path1 . basename( $_FILES['uploadedfile']['name']);

  if(move_uploaded_file($_FILES['uploadedfile']['tmp_name'], $target_path1)) {
      $data['result'] = "Success";
      $target_path2 = $target_path2 . basename($_FILES['uploadedfile']['name']);
      //$data['shell'] = shell_exec('./dewrapper -R 1200 -inte 1080 -fin ' . $target_path1 . ' -fout ' . $target_path2);
      $data['shell'] = shell_exec('convert ' . $target_path1 . ' +distort DePolar 0 ' . $target_path2);
  } else {
      $data['result'] =  "Failure";
  }
}

$xml = new SimpleXMLElement("<?xml version=\"1.0\"?><uploadResult></uploadResult>");
array_to_xml($data, $xml);
print_r($data);
$textual = ob_get_contents();
file_put_contents("../../upload_log.txt", $textual, FILE_APPEND);
ob_end_clean();

print $xml->asXML();
