package ee.tvp.gosky.tasks;

import android.os.AsyncTask;
import android.util.Log;
import ee.tvp.gosky.utils.UploadByteStream;

public class AsyncUploadTask extends AsyncTask<byte[], Void, String> {

	public static String TAG = AsyncUploadTask.class.getSimpleName();
	
	private String _serverUrl = null;
	private String _fileName = null;
	
	public AsyncUploadTask(String serverUrl, String fileName){
		_serverUrl = serverUrl;
		_fileName = fileName;
	}
	
	@Override
	protected String doInBackground(byte[]... params) {
		Log.d(TAG, "AsyncUploadTask.doInBackground()");
		
		byte[] bytes = params[0];
		
		UploadByteStream uploadFile = new UploadByteStream(_serverUrl, _fileName, bytes);
		uploadFile.start();

		return null;
	}

}
