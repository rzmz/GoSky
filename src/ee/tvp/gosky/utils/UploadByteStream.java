package ee.tvp.gosky.utils;

import java.io.ByteArrayInputStream;
import java.io.DataOutputStream;
import java.net.HttpURLConnection;
import java.net.URL;

import android.util.Log;

public class UploadByteStream {
	
	public static String TAG = UploadByteStream.class.getSimpleName();

	private String _serverUrl = null;
	private String _fileName = null;
	private byte[] _bytes = null;
	
	public UploadByteStream(String serverUrl, String fileName, byte[] bytes){
		_serverUrl = serverUrl;
		_fileName = fileName;
		_bytes = bytes;
	}
	
	public void start(){
		
		HttpURLConnection conn = null;
		DataOutputStream dos = null;
		ByteArrayInputStream bis = new ByteArrayInputStream(_bytes);
		String lineEnd = "\r\n";
		String twoHyphens = "--";
		String boundary = "*****";

		int bytesRead, bytesAvailable, bufferSize;
		byte[] buffer;
		int maxBufferSize = 1 * 1024 * 1024;

		try {

			URL url = new URL(_serverUrl);
			conn = (HttpURLConnection) url.openConnection();

			Log.d(TAG, "Http connection opened to " + _serverUrl);

			// Allow Inputs & Outputs
			conn.setDoInput(true);
			conn.setDoOutput(true);
			conn.setUseCaches(false);

			// Enable POST method
			conn.setRequestMethod("POST");
			conn.setRequestProperty("Connection", "Keep-Alive");
			conn.setRequestProperty("ENCTYPE", "multipart/form-data");
			conn.setRequestProperty("Content-Type", "multipart/form-data;boundary=" + boundary);

			dos = new DataOutputStream(conn.getOutputStream());
			dos.writeBytes(twoHyphens + boundary + lineEnd);
			dos.writeBytes("Content-Disposition: form-data; name=\"uploadedfile\";filename=\"" + _fileName + "\"" + lineEnd);
			dos.writeBytes(lineEnd);

			// create a buffer of maximum size
			bytesAvailable = bis.available();
			bufferSize = Math.min(bytesAvailable, maxBufferSize);
			buffer = new byte[bufferSize];

			// Read file and write it into form...
			bytesRead = bis.read(buffer, 0, bufferSize);

			while (bytesRead > 0) {
				dos.write(buffer, 0, bufferSize);
				bytesAvailable = bis.available();
				bufferSize = Math.min(bytesAvailable, maxBufferSize);
				bytesRead = bis.read(buffer, 0, bufferSize);
			}

			dos.writeBytes(lineEnd);
			dos.writeBytes(twoHyphens + boundary + twoHyphens + lineEnd);

			// Responses from the server (code and message)
			Integer serverResponseCode = conn.getResponseCode();
			String serverResponseMessage = conn.getResponseMessage();
//			Document doc = parseXML(conn.getInputStream());
//	        NodeList descNodes = doc.getElementsByTagName("uploadResult");
//	        Node parentNode = descNodes.item(0);
//	        NodeList childNodes = parentNode.getChildNodes();
			
			bis.close(); // this is not actually nescessary, because it is not associated with any external resources
			dos.flush();
			dos.close();

			Log.d(TAG, "Response code: " + serverResponseCode.toString());
			Log.d(TAG, "Response message: " + serverResponseMessage);
		} catch (Exception e) {
			Log.d(TAG, "Exception uploading:" + e.getMessage());
			e.printStackTrace();
		}		
	}
}
