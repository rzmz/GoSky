package ee.tvp.gosky.utils;

import java.io.File;
import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.io.IOException;
import java.util.List;

import android.annotation.SuppressLint;
import android.graphics.ImageFormat;
import android.hardware.Camera;
import android.hardware.Camera.AutoFocusCallback;
import android.hardware.Camera.Parameters;
import android.hardware.Camera.PictureCallback;
import android.hardware.Camera.PreviewCallback;
import android.hardware.Camera.ShutterCallback;
import android.util.Log;
import android.view.SurfaceHolder;
import android.view.SurfaceHolder.Callback;
import android.view.SurfaceView;
import ee.tvp.gosky.MainActivity;

public class Cam implements PictureCallback, ShutterCallback, AutoFocusCallback, PreviewCallback {
	
	static final String TAG = Cam.class.getSimpleName();
	
	MainActivity _activity = null;
	
	public Cam(MainActivity activity){
		_activity = activity;
		setSurfaceHolder();
	}
	
	@SuppressLint("InlinedApi")
	private void setCameraParameters(Camera camera) {
		Camera.Parameters parameters = camera.getParameters();
		List<Camera.Size> sizes = parameters.getSupportedPictureSizes();

		int max = 0;
		int index = 0;

		for (int i = 0; i < sizes.size(); i++) {
			Camera.Size s = sizes.get(i);
			int size = s.height * s.width;
			if (size > max) {
				index = i;
				max = size;
			}
		}

		parameters.setPictureSize(sizes.get(index).width, sizes.get(index).height);
		parameters.setPictureFormat(ImageFormat.JPEG);
		parameters.setJpegQuality(100);
		parameters.setFlashMode(Parameters.FLASH_MODE_OFF);

		if(_activity.isHdr()){
			parameters.setSceneMode(Parameters.SCENE_MODE_HDR);
		} else {
			parameters.setSceneMode(Parameters.SCENE_MODE_AUTO);
		}
		
		camera.setParameters(parameters);

		Log.d(TAG,
				String.format("Camera size set to: %sx%s",
						parameters.getPictureSize().width,
						parameters.getPictureSize().height));
	}

	private SurfaceView surfaceView = null;
	private SurfaceHolder surfaceHolder = null;
	private void setSurfaceHolder(){
		if(surfaceView == null){
			surfaceView = _activity.getSurfaceView();
			Log.d("HOLDER", "New surfaceview created");
		}
		if(surfaceHolder == null){
			surfaceHolder = surfaceView.getHolder();
			Log.d("HOLDER", "Surfaceholder created");

			surfaceHolder.addCallback(new Callback(){
				@Override
				public void surfaceChanged(SurfaceHolder holder,
						int format, int width, int height) {
					Log.d("HOLDER", "surfaceChanged()");
				}

				@Override
				public void surfaceCreated(SurfaceHolder holder) {
					_activity.setAppReady(true);
					Log.d("HOLDER", "surfaceCreated()");
				}

				@Override
				public void surfaceDestroyed(SurfaceHolder holder) {
					Log.d("HOLDER", "surfaceDestroyed()");
				}
				
			});
		}
	}
	
	private SurfaceHolder getSurfaceHolder(){
		if(surfaceHolder == null){
			setSurfaceHolder();
		}
		return surfaceHolder;
	}

	private Camera _cameraInstance = null;	
	public Camera getInstance(){
		if(_cameraInstance == null){
			try {
				_cameraInstance = Camera.open();
			} catch (Exception e) {
				Log.d(TAG, "Error getting camera instance.");
				e.getStackTrace();
			}
		}
		return _cameraInstance;
	}
	
	public void takePicture() {

		Log.d(TAG, "Start takePicture()");
				
		if (getInstance() != null) {
			try {
				setCameraParameters(getInstance());
				getInstance().setPreviewDisplay(getSurfaceHolder());
				getInstance().autoFocus(this);
				getInstance().startPreview();
				getInstance().takePicture(this, null, this);
				Log.d(TAG, "End takePicture()");
				
			} catch (Throwable e) {
				Log.d(TAG, "Exception in takePicture: " + e.getMessage());
				e.printStackTrace();
			} finally {
			}
		} else {
			Log.d(TAG, "No camera present!");
		}
	}

	@Override
	public void onShutter() {
		Log.d(TAG, "Start onShutter()");		
	}

	@Override
	public void onPreviewFrame(byte[] data, Camera camera) {
		Log.d(TAG, "Start onPreviewFrame()");		
	}

	@Override
	public void onAutoFocus(boolean success, Camera camera) {
		Log.d(TAG, "Start onAutoFocus()");
	}
	
	@Override
	public void onPictureTaken(byte[] data, Camera camera) {
		Log.d(TAG, "Start onPictureTaken");

		try {
			if (data == null || data.length == 0) {
				Log.d(TAG, "Image size is 0, nothing to save.");
			} else {
				File pictureFile = _activity.getStorage().createOutputImageFile();
				if (pictureFile == null) {
					Log.d(TAG, "Error creating media file, check storage permissions.");
				} else {
					Log.d(TAG, "File absolute path: " + pictureFile.getAbsolutePath());
					FileOutputStream fos = new FileOutputStream(pictureFile);
					fos.write(data);
					fos.close();
					new AsyncHttpPostTask(_activity.getUploadScriptUrl()).execute(pictureFile);					
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
	}

}
