package ee.tvp.gosky.tasks;

import java.io.File;

import android.os.AsyncTask;
import android.util.Log;

public class AsyncHttpPostTask extends AsyncTask<File, Void, String> {

	private static final String TAG = AsyncHttpPostTask.class.getSimpleName();
	private String _serverUrl;

	public AsyncHttpPostTask(final String _serverUrl) {
		this._serverUrl = _serverUrl;
	}

	@Override
	protected String doInBackground(File... params) {

		Log.d(TAG, "AsyncHttpPostTask.doInBackground()");
		Log.d(TAG, "File name: " + params[0]);
		
		return null;
	}

}
