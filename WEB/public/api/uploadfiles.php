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

const CODE_NULL = 0;
const CODE_OK = 1;

$data = array();
$data['files'] = $_FILES;
$data['post'] = $_POST;
$data['get'] = $_GET;
$data['datetime'] = date('Y-m-d H:i:s');
$data['ip'] = $_SERVER['REMOTE_ADDR'];
$data['resultMessage'] = "";
$data['resultCode'] = CODE_NULL;

$data['server'] = $_SERVER;

if($_FILES && sizeof($_FILES) > 0){
  
  if(isset($_GET['identifierKey'])){
    $upload_base_path = "../incoming/" . $_GET['identifierKey'] . "/" . date("Ymd") . "/" . date("H") . "/";
    if(!file_exists($upload_base_path)){
      mkdir($upload_base_path, 0777, true);
    }
  
    $upload_converted_path = $upload_base_path . "converted/";
    if(!file_exists($upload_converted_path)){
      mkdir($upload_converted_path);
    }
  
    $target_file_path = $upload_base_path . basename( $_FILES['uploadedfile']['name']);

    if(move_uploaded_file($_FILES['uploadedfile']['tmp_name'], $target_file_path)) {
        $data['resultMessage'] = "Success";
        $data['resultCode'] = CODE_OK;
        $target_converted_file_path = $upload_converted_path . basename($_FILES['uploadedfile']['name']);
        //$data['shell'] = shell_exec('./dewrapper -R 1200 -inte 1080 -fin ' . $target_path1 . ' -fout ' . $target_path2); // this is the old way
        // do the distort depolar conversion
        $data['shell'] = shell_exec('convert ' . $target_file_path . ' +distort DePolar 0 ' . $target_converted_file_path);
    } else {
        $data['resultMessage'] =  "Failure";
    }    
  } else {
    $data['resultMessage'] = "You are using an old version of the application. Please upgrade.";
  }
} else {
  $data['resultMessage'] = "no files!";
}

$xml = new SimpleXMLElement("<?xml version=\"1.0\"?><uploadResult></uploadResult>");
array_to_xml($data, $xml);
print_r($data);
$textual = ob_get_contents();
file_put_contents($upload_base_path . "upload_log.txt", $textual, FILE_APPEND);
ob_end_clean();

print $xml->asXML();
