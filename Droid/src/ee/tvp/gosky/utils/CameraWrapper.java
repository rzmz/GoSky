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
import ee.tvp.gosky.Preferences;
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

		String pictureSizeIndex = _activity.getPref().getString(Preferences.PICTURE_SIZE_PREF, "0");
		int index = Integer.parseInt(pictureSizeIndex);
		
		parameters.setPictureSize(sizes.get(index).width, sizes.get(index).height);
		parameters.setPictureFormat(ImageFormat.JPEG);
		parameters.setJpegQuality(60);
		parameters.setFlashMode(Parameters.FLASH_MODE_OFF);

		List<String> sceneModes = getSupportedSceneModes();
		
		if(sceneModes != null && sceneModes.size() > 0) {
			String sceneMode = _activity.getPref().getString(Preferences.SCENE_MODE_PREF, sceneModes.get(0));
			parameters.setSceneMode(sceneMode);			
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
		
		Log.d(TAG, String.format("Scene mode set to: %s", parameters.getSceneMode()));
		
		_haveParametersBeenSet = true;
		
	}

	private SurfaceView surfaceView = null;
	private SurfaceHolder surfaceHolder = null;
	private void setSurfaceHolder(){
		if(surfaceView == null){
			surfaceView = _activity.getSurfaceView();
		}
		if(surfaceHolder == null){
			surfaceHolder = surfaceView.getHolder();

			surfaceHolder.addCallback(new Callback(){
				@Override
				public void surfaceChanged(SurfaceHolder holder,
						int format, int width, int height) {
					setPreviewDisplay(holder);
					Log.d("HOLDER", "surfaceChanged()");
				}

				@Override
				public void surfaceCreated(SurfaceHolder holder) {
					setPreviewDisplay(holder);
					Log.d("HOLDER", "surfaceCreated()");
				}

				@Override
				public void surfaceDestroyed(SurfaceHolder holder) {
					setPreviewDisplay(holder);
					Log.d("HOLDER", "surfaceDestroyed()");
				}				
			});
		}
	}
	
	private void setPreviewDisplay(SurfaceHolder holder){
		try {
			getInstance().setPreviewDisplay(holder);
			_activity.setAppReady(true);
		} catch (IOException e) {
			Log.e(TAG, "Cannot set preview display");
			e.printStackTrace();
		}
	}
	
	public SurfaceHolder getSurfaceHolder(){
		if(surfaceHolder == null){
			setSurfaceHolder();
		}
		return surfaceHolder;
	}

	private static Camera _cameraInstance = null;
	public static Camera getInstance(){
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
		
	private static Parameters _parameters = null;
	public static Parameters getParameters(){
		if(_parameters == null){
			_parameters = getInstance().getParameters();
		}
		return _parameters;
	}
	
	private static List<String> _supportedSceneModes = null;
	public static List<String> getSupportedSceneModes(){
		if(_supportedSceneModes == null){
			_supportedSceneModes = getParameters().getSupportedSceneModes();
		}
		return _supportedSceneModes;
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
