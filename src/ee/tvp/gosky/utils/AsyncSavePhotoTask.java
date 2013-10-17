package ee.tvp.gosky.utils;

import java.io.File;
import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.io.IOException;

import android.os.AsyncTask;
import android.util.Log;
import ee.tvp.gosky.MainActivity;

public class AsyncSavePhotoTask extends AsyncTask<byte[], String, String> {

	public static String TAG = AsyncSavePhotoTask.class.getSimpleName();
	
	MainActivity _activity;
	
	public AsyncSavePhotoTask(MainActivity activity){
		_activity = activity;
	}
	
	@Override
	protected String doInBackground(byte[]... data) {
				
		try {
			if (data == null || data.length == 0) {
				Log.d(TAG, "Image size is 0, nothing to save.");
			} else {
				Log.d(TAG, String.format("Got %d bytes", data[0].length));
				File photo = _activity.getStorage().createOutputImageFile();
				if (photo == null) {
					Log.d(TAG, "Error creating media file, check storage permissions.");
				} else {
					Log.d(TAG, "File absolute path: " + photo.getAbsolutePath());
					FileOutputStream fos = new FileOutputStream(photo);
					fos.write(data[0]);
					fos.flush();
					fos.close();
					new AsyncHttpPostTask(_activity.getUploadScriptUrl()).execute(photo);					
				}
			}
		} catch (FileNotFoundException e) {
			Log.d(TAG, "File not found: " + e.getMessage());
			e.printStackTrace();
		} catch (IOException e) {
			Log.d(TAG, "Error accessing file: " + e.getMessage());
			e.printStackTrace();
		} catch (Throwable e) {
			Log.d(TAG, "Unknown error: " + e.getMessage());
			e.printStackTrace();
		}

		return null;
	}

}
