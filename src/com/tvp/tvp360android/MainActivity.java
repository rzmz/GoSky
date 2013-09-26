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
import android.util.Log;
import android.view.Menu;
import android.view.View;

import android.view.SurfaceView;

public class MainActivity extends Activity implements Camera.PreviewCallback, Camera.ErrorCallback, Camera.ShutterCallback, PictureCallback {

	public static final int MEDIA_TYPE_IMAGE = 1;
	public static final String TAG = "MainActivity";
    private Camera myCamera;

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
        myCamera.release();
        Log.d(TAG, "Camera released, app paused");
    }

    @Override
    protected void onDestroy(){
        super.onDestroy();
        myCamera.release();
        Log.d(TAG, "Camera released, app destroyed");
    }

    @Override
    protected void onResume(){
        super.onResume();
        try {
            if(myCamera != null){
                myCamera.reconnect();
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
	
	public void takeShotsNoPreview(View view){

        if(myCamera == null){
            if(checkCameraHardware(view.getContext())){
                myCamera = getCameraInstance();
            }
        }

        if(myCamera != null){
            try {
                Log.d(TAG, "Start of taking picture");
                SurfaceView dummy = new SurfaceView(view.getContext());
                myCamera.setPreviewDisplay(dummy.getHolder());
                myCamera.startPreview();
                myCamera.setPreviewCallback(this);
                myCamera.setErrorCallback(this);
                myCamera.takePicture(null, null, this);
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
            myCamera.stopPreview();
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
