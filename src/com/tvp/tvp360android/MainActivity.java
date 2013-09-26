package com.tvp.tvp360android;

import java.io.File;
import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.io.IOException;
import java.text.SimpleDateFormat;
import java.util.Date;

import android.app.Activity;
import android.content.Context;
import android.content.pm.PackageManager;
import android.hardware.Camera;
import android.hardware.Camera.PictureCallback;
import android.os.Bundle;
import android.os.Environment;
import android.os.Handler;
import android.util.Log;
import android.view.Menu;
import android.view.View;

import android.view.SurfaceView;
import android.widget.Button;

public class MainActivity extends Activity implements Camera.PreviewCallback, Camera.ErrorCallback, Camera.ShutterCallback, PictureCallback {

	public static final int MEDIA_TYPE_IMAGE = 1;
	public static final String TAG = "MainActivity";
    private Camera _myCamera;

    private final Handler _handler = new Handler();

    private View _view = null;

    // time interval in seconds
    private int _interval = 5;

    private boolean _externalStorageAvailable = false;
    private boolean _externalStorageWritable = false;

    private boolean _isTakingPictures = false;

	@Override
	protected void onCreate(Bundle savedInstanceState) {
		super.onCreate(savedInstanceState);
		setContentView(R.layout.activity_main);
    }

	@Override
	public boolean onCreateOptionsMenu(Menu menu) {
		// Inflate the menu; this adds items to the action bar if it is present.
		getMenuInflater().inflate(R.menu.main, menu);
		return true;
	}

    @Override
    protected void onPause(){
        super.onPause();
        if(_myCamera != null){
            _myCamera.release();
            Log.d(TAG, "Camera released, app paused");
        }
        if(_isTakingPictures){
            handlerRemoveCallbacks();
        }
    }

    @Override
    protected void onDestroy(){
        super.onDestroy();
        if(_myCamera != null){
            _myCamera.release();
            Log.d(TAG, "Camera released, app destroyed");
        }
    }

    @Override
    protected void onResume(){
        super.onResume();
        try {
            if(_myCamera != null){
                _myCamera.reconnect();
            }
        } catch (IOException e) {
            Log.d(TAG, "Error reconnecting to Camera!");
        }
    }

	/** Check if this device has a camera */
	private boolean checkCameraHardware(Context context) {
	    if (context.getPackageManager().hasSystemFeature(PackageManager.FEATURE_CAMERA)){
	        // this device has a camera
	        return true;
	    } else {
	        // no camera on this device
	        return false;
	    }
	}
	
	/** A safe way to get an instance of the Camera object. */
	private Camera getCameraInstance(){
	    Camera c = null;
	    try {
	        c = Camera.open(); // attempt to get a Camera instance
	    }
	    catch (Exception e){
	        // Camera is not available (in use or does not exist)
	    }
	    return c; // returns null if camera is unavailable
	}

    /**
     * This method gets called from the activity_main view when start/stop button is pressed
     * @param view
     */
    public void toggleAction(View view){
        _view = view;
        _isTakingPictures = !_isTakingPictures;
        Button _button = (Button) findViewById(R.id.startStop);
        if(!_isTakingPictures){
            _button.setText(R.string.start);
            handlerRemoveCallbacks();
        } else {
            _button.setText(R.string.stop);
            handlerPostDelayed();
        }
    }

    private long getIntervalInMillis(){
        return _interval * 1000;
    }

    private Runnable _runnable = new Runnable() {
        @Override
        public void run() {
            takePicture();
            handlerPostDelayed();
        }
    };

    private void handlerPostDelayed(){
        _handler.postDelayed(_runnable, getIntervalInMillis());
    }

    private void handlerRemoveCallbacks(){
        _handler.removeCallbacks(_runnable);
    }

	private void takePicture(){

        if(_view == null){
            Log.d(TAG, "No view! Cannot take picture");
            return;
        }

        if(_myCamera == null){
            if(checkCameraHardware(_view.getContext())){
                _myCamera = getCameraInstance();
            }
        }

        if(_myCamera != null){
            try {
                Log.d(TAG, "Start of taking picture");
                SurfaceView dummy = new SurfaceView(_view.getContext());
                _myCamera.setPreviewDisplay(dummy.getHolder());
                _myCamera.startPreview();
                _myCamera.setPreviewCallback(this);
                _myCamera.setErrorCallback(this);
                _myCamera.takePicture(null, null, this);
                Log.d(TAG, "End of taking picture");
            } catch (Throwable e){
                Log.d(TAG, "Exception in takeShotsNoPreview: " + e.getMessage());
                e.printStackTrace();
            }
        }
        else {
            Log.d(TAG, "No camera present!");
        }
	}

	/** Create a File for saving an image or video */
	private File getOutputMediaFile(int type){
	    // To be safe, you should check that the SDCard is mounted
	    // using Environment.getExternalStorageState() before doing this.

		String directory = Environment.DIRECTORY_PICTURES;

        /*
         There are two options for getting a storage directory on the SD card:
         Environment.getExternalStoragePublicDirectory(): this uses a public directory. If the app is uninstalled, the photos will remain.
         Context.getExternalFilesDir(): this uses a directory which is private to the app. If the app is uninstalled, the photos will also be deleted.
        */

	    File mediaStorageDir = new File(Environment.getExternalStoragePublicDirectory(directory), getPackageName());

	    // Create the storage directory if it does not exist
	    if (!mediaStorageDir.exists()){
	        if (!mediaStorageDir.mkdirs()){
	            Log.d(TAG, "failed to create directory");
	            return null;
	        }
	    }

        // Create a media file name
	    String timeStamp = new SimpleDateFormat("yyyyMMdd_HHmmss").format(new Date());
	    File mediaFile;
	    if (type == MEDIA_TYPE_IMAGE){
	        mediaFile = new File(mediaStorageDir.getPath() + File.separator + "IMG_"+ timeStamp + ".jpg");
	    } else {
	        return null;
	    }

	    return mediaFile;
	}

    @Override
    public void onPreviewFrame(byte[] bytes, Camera camera) {
        Log.d(TAG, "Start onPreviewFrame");
    }

    @Override
    public void onError(int i, Camera camera) {
        Log.d(TAG, "Start onError");
    }

    @Override
    public void onShutter() {
        Log.d(TAG, "Start onShutter");
    }

    @Override
    public void onPictureTaken(byte[] bytes, Camera camera) {
        Log.d(TAG, "Start onPictureTaken");

        if(bytes == null || bytes.length == 0){
            Log.d(TAG, "Image size is 0, nothing to save.");
            return;
        }

        File pictureFile = getOutputMediaFile(MEDIA_TYPE_IMAGE);
        if (pictureFile == null){
            Log.d(TAG, "Error creating media file, check storage permissions.");
            return;
        }

        try {
            Log.d(TAG, "File name: " + pictureFile.getAbsolutePath());
            FileOutputStream fos = new FileOutputStream(pictureFile);
            fos.write(bytes);
            fos.close();
            _myCamera.stopPreview();
        } catch (FileNotFoundException e) {
            Log.d(TAG, "File not found: " + e.getMessage());
            e.printStackTrace();
        } catch (IOException e) {
            Log.d(TAG, "Error accessing file: " + e.getMessage());
            e.printStackTrace();
        } catch (Throwable e){
            Log.d(TAG, "Unknown error: " + e.getMessage());
            e.printStackTrace();
        }
    }
}
