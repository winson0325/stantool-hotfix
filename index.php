<?php
$proxy_pass = 'http://127.0.0.1:3000';
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $proxy_pass . $_SERVER['REQUEST_URI']);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HEADER, true);
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $_SERVER['REQUEST_METHOD']);

$headers = [];
foreach (getallheaders() as $key => $value) {
    if (strtolower($key) !== 'host') {
        $headers[] = "$key: $value";
    }
}
curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
$input = file_get_contents('php://input');
if ($input) curl_setopt($ch, CURLOPT_POSTFIELDS, $input);

$response = curl_exec($ch);
$header_size = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
$header = substr($response, 0, $header_size);
$body = substr($response, $header_size);

foreach (explode("\r\n", $header) as $h) {
    if (!empty($h) && !preg_match('/^Transfer-Encoding:/i', $h)) {
        header($h);
    }
}
echo $body;
?>
