package ee.tvp.gosky.utils;

import java.io.IOException;
import java.util.List;

import android.annotation.SuppressLint;
import android.graphics.ImageFormat;
import android.hardware.Camera;
import android.hardware.Camera.Parameters;
import android.hardware.Camera.PictureCallback;
import android.hardware.Camera.Size;
import android.util.Log;
import android.view.SurfaceHolder;
import android.view.SurfaceHolder.Callback;
import android.view.SurfaceView;
import ee.tvp.gosky.MainActivity;
import ee.tvp.gosky.tasks.AsyncSavePhotoTask;
import ee.tvp.gosky.tasks.AsyncUploadTask;

public class CameraWrapper implements PictureCallback {
	
	static final String TAG = CameraWrapper.class.getSimpleName();
	static boolean SaveOnCard = false;
	
	MainActivity _activity = null;
	boolean _haveParametersBeenSet = false;
	
	public CameraWrapper(MainActivity activity){
		_activity = activity;
		setSurfaceHolder();
	}
	
	@SuppressLint("InlinedApi")
	private void setCameraParameters() {
		
		Log.d(TAG, "setCameraParameters()");
		
		Parameters parameters = getInstance().getParameters();
		List<Size> sizes = parameters.getSupportedPictureSizes();

		int max = 0;
		int index = 0;

		for (int i = 0; i < sizes.size(); i++) {
			Size s = sizes.get(i);
			int size = s.height * s.width;
			if (size > max) {
				index = i;
				max = size;
			}
		}

		parameters.setPictureSize(sizes.get(index).width, sizes.get(index).height);
		parameters.setPictureFormat(ImageFormat.JPEG);
		parameters.setJpegQuality(60);
		parameters.setFlashMode(Parameters.FLASH_MODE_OFF);

		if(_activity.isHdr()){
			parameters.setSceneMode(Parameters.SCENE_MODE_HDR);
		} else {
			parameters.setSceneMode(Parameters.SCENE_MODE_AUTO);
		}
		
		try{
			getInstance().setParameters(parameters);
		} catch(Throwable e){
			Log.d(TAG, "Error setting camera parameters");
			e.getStackTrace();
		}

		Log.d(TAG,
				String.format("Camera size set to: %sx%s",
						parameters.getPictureSize().width,
						parameters.getPictureSize().height));
		
		_haveParametersBeenSet = true;
		
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
					try {
						getInstance().setPreviewDisplay(holder);
					} catch (IOException e) {
						// TODO Auto-generated catch block
						e.printStackTrace();
					}
					Log.d("HOLDER", "surfaceCreated()");
				}

				@Override
				public void surfaceDestroyed(SurfaceHolder holder) {
					Log.d("HOLDER", "surfaceDestroyed()");
				}
				
			});
		}
	}
	
	public SurfaceHolder getSurfaceHolder(){
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
			if(!_haveParametersBeenSet){
				setCameraParameters();
			}
			try {
				getInstance().startPreview();
				getInstance().takePicture(null, null, this);
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
	public void onPictureTaken(byte[] data, Camera camera) {
		
		Log.d(TAG, "Start onPictureTaken");
		if(SaveOnCard){
			new AsyncSavePhotoTask(_activity).execute(data);			
		} else {
			String serverUrl = _activity.getUploadScriptUrl();
			String fileName = _activity.getStorage().getOutputImageFileName();
			new AsyncUploadTask(serverUrl, fileName).execute(data);
		}
		camera.stopPreview();

	}

}
