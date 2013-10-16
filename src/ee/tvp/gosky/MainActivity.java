package ee.tvp.gosky;

import java.io.File;
import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.io.IOException;
import java.lang.reflect.Method;
import java.util.List;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Context;
import android.content.pm.PackageManager;
import android.hardware.Camera;
import android.hardware.Camera.Parameters;
import android.net.ConnectivityManager;
import android.net.wifi.WifiManager;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.os.Handler;
import android.util.Log;
import android.view.SurfaceView;
import android.view.View;
import android.widget.EditText;
import android.widget.ToggleButton;
import ee.tvp.gosky.utils.AsyncHttpPostTask;
import ee.tvp.gosky.utils.Cam;
import ee.tvp.gosky.utils.ExternalStorage;
import ee.tvp.gosky.utils.Messenger;
import ee.tvp.gosky.utils.SysInfo;

public class MainActivity extends Activity implements Camera.PreviewCallback,
		Camera.ErrorCallback, Camera.ShutterCallback, Camera.PictureCallback,
		Camera.AutoFocusCallback {

	final Context _context = this;
	final Messenger _messenger = new Messenger(_context);

	static final String TAG = MainActivity.class.getSimpleName();

	final Handler _handler = new Handler();

	int _interval = 60;
	boolean _isTakingPictures = false;
	String _uploadScriptUrl = null;

	WifiManager _wifiManager = null;
	ConnectivityManager _connectivityManager = null;

	Cam _camera = null;
	ExternalStorage _storage = null;

	boolean _isHdr = false;
	
	// UI elements
	EditText _uploadUrl = null;
	EditText _intervalSeconds = null;
	ToggleButton _dataButton = null;
	ToggleButton _hdrButton = null;
	ToggleButton _wifiButton = null;
	
	@Override
	protected void onCreate(Bundle savedInstanceState) {

		super.onCreate(savedInstanceState);
		setContentView(R.layout.activity_main);
		
		_uploadUrl = (EditText) findViewById(R.id.uploadUrl);
		_intervalSeconds = (EditText) findViewById(R.id.intervalSeconds);
		_wifiButton = (ToggleButton) findViewById(R.id.toggleWifi);
		_dataButton = (ToggleButton) findViewById(R.id.toggleData);
		_hdrButton = (ToggleButton) findViewById(R.id.toggleHdr);
		_wifiManager = (WifiManager) getSystemService(Context.WIFI_SERVICE);
		_connectivityManager = (ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);
		
		readyDevice();
	}

	/**
	 * Checks device features and shows the message dialog with appropriate exit
	 * strategy (Exits when no camera is found)
	 */
	private void readyDevice() {

		if (!ExternalStorage.isAvailable()) {
			_messenger.failure(R.string.externalStorageUnavailable);
		} else {
			_storage = new ExternalStorage(this);
		}

		if (!hasCamera()) {
			_messenger.failure(R.string.cameraUnavailable);
		} else {
			_camera = new Cam(this);
		}

		if (hasWifi()) {
			_wifiButton.setChecked(_wifiManager.isWifiEnabled());
		} else {
			_wifiButton.setClickable(false);
			_wifiButton.setEnabled(false);
			_messenger.notice(R.string.no_wifi_present);
			Log.i(TAG, getResources().getString(R.string.no_wifi_present));
		}
		
		_dataButton.setChecked(getMobileDataEnabled());
		
		if(!hasHdr()){
			_messenger.notice(R.string.hdrUnavailable);
			_hdrButton.setClickable(false);
			_hdrButton.setEnabled(false);
		}
		
	}

	private boolean hasCamera() {
		return getPackageManager().hasSystemFeature(PackageManager.FEATURE_CAMERA) && Camera.getNumberOfCameras() > 0;
	}

	private boolean hasWifi() {
		return getPackageManager()
				.hasSystemFeature(PackageManager.FEATURE_WIFI);
	}

	private Camera getCameraInstance() {
		Camera c = null;
		try {
			c = Camera.open();
		} catch (Exception e) {
			Log.d(TAG, "Error getting camera instance.");
			e.getStackTrace();
		}
		return c;
	}

	public void toggleWifi(View view) {
		_wifiManager.setWifiEnabled(!_wifiManager.isWifiEnabled());
		Log.d(TAG,
				String.format("Wifi connection %s",
						_wifiManager.isWifiEnabled() ? "disabled" : "enabled"));
	}

	public void toggleHDR(View view) {
		_isHdr = !_isHdr;
		Log.d(TAG, String.format("HDR %s",  _isHdr ? "enabled" : "disabled"));
	}

	private boolean getMobileDataEnabled() {
		try {
			Method method = _connectivityManager.getClass().getMethod(
					"getMobileDataEnabled");
			return (Boolean) method.invoke(_connectivityManager);
		} catch (Exception e) {
			e.printStackTrace();
			return false;
		}
	}

	private void setMobileDataEnabled(boolean on) {
		try {
			Method method = _connectivityManager.getClass().getMethod(
					"setMobileDataEnabled", boolean.class);
			method.invoke(_connectivityManager, on);
		} catch (NoSuchMethodException e) {
			e.printStackTrace();
		} catch (Exception e) {
			e.printStackTrace();
		}
	}

	public void toggleData(View view) {
		setMobileDataEnabled(!getMobileDataEnabled());
		Log.d(TAG, String.format("Data connection %s",
				getMobileDataEnabled() ? "disabled" : "enabled"));
	}

	public void toggleAction(View view) {

		_isTakingPictures = !_isTakingPictures;

		_uploadScriptUrl = _uploadUrl.getText().toString();

		if (!_uploadScriptUrl.contains("http://")) {
			_uploadScriptUrl = String.format("http://%s", _uploadScriptUrl);
		}

		if (!_uploadScriptUrl.contains("/uploadfiles.php")) {
			_uploadScriptUrl = String.format("%s/uploadfiles.php",
					_uploadScriptUrl);
		}

		if (_uploadScriptUrl.contains("grim")) {
			_uploadScriptUrl = _uploadScriptUrl.replace("grim", "84.50.139.87");
		}

		_interval = Integer.parseInt(_intervalSeconds.getText().toString());

		if (_interval == 0) {
			_interval = 60;
		}

		Log.d(TAG, "Upload script url set to: " + _uploadScriptUrl);
		Log.d(TAG, "Time interval set to: " + _interval);

		if (!_isTakingPictures) {
			handlerRemoveCallbacks();
		} else {
			handlerPostDelayed();
		}
	}

	private long getIntervalInMillis() {
		return _interval * 1000;
	}

	private void monitor(){
		Log.d("MONITOR",
				String.format("Available memory: %dMiB",
						SysInfo.getAvailableMemory(_context)));
		Log.d("MONITOR",
				String.format("External storage state: %s",
						Environment.getExternalStorageState()));
		Log.d("MONITOR",
				String.format("Available SD Card size: %dMiB",
						SysInfo.getAvailableSDCardSize(_context)));		
	}
	
	private Runnable _runnable = new Runnable() {
		@Override
		public void run() {
			takePicture();
			monitor();
			handlerPostDelayed();
		}
	};

	private void handlerPostDelayed() {
		_handler.postDelayed(_runnable, getIntervalInMillis());
	}

	private void handlerRemoveCallbacks() {
		_handler.removeCallbacks(_runnable);
	}

	@SuppressLint("InlinedApi")
	private boolean hasHdr(){
		boolean hdr = false;
		if(Build.VERSION.SDK_INT >= Build.VERSION_CODES.JELLY_BEAN_MR1){
			Camera cam = getCameraInstance();
			if(cam != null){
				Parameters parameters = cam.getParameters();
				hdr = parameters.getSupportedSceneModes().contains(Parameters.SCENE_MODE_HDR);
				cam.release();
			}
		}
		return hdr;
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
		parameters.setJpegQuality(60);

		if(_isHdr && hasHdr()){
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

	@SuppressLint("NewApi")
	private void takePicture() {

		Log.d(TAG, "Start takePicture()");
		
		Camera camera = getCameraInstance();
		
		if (camera != null) {
			try {
				
				setCameraParameters(camera);

				Log.d(TAG, "Start of taking picture");
				
				SurfaceView dummy = new SurfaceView(this);
				camera.setPreviewDisplay(dummy.getHolder());								
				camera.startPreview();
				camera.setPreviewCallback(this);
				camera.setErrorCallback(this);
				camera.autoFocus(this);
				camera.takePicture(null, null, this);
				Log.d(TAG, "End of taking picture");
			} catch (Throwable e) {
				Log.d(TAG, "Exception in takePicture: " + e.getMessage());
				e.printStackTrace();
			} finally {
				camera.stopPreview();
				camera.release();
			}
		} else {
			Log.d(TAG, "No camera present!");
		}
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

		if (bytes == null || bytes.length == 0) {
			Log.d(TAG, "Image size is 0, nothing to save.");
			return;
		}

		File pictureFile = _storage.createOutputImageFile();

		if (pictureFile == null) {
			Log.d(TAG, "Error creating media file, check storage permissions.");
			return;
		}

		try {
			Log.d(TAG, "File absolute path: " + pictureFile.getAbsolutePath());
			FileOutputStream fos = new FileOutputStream(pictureFile);
			fos.write(bytes);
			fos.close();
			new AsyncHttpPostTask(_uploadScriptUrl).execute(pictureFile);
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

	@Override
	public void onAutoFocus(boolean b, Camera camera) {
		Log.d(TAG, "Autofocus");
	}
}
