package ee.tvp.gosky;

import java.lang.reflect.Method;

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
import ee.tvp.gosky.utils.Cam;
import ee.tvp.gosky.utils.ExternalStorage;
import ee.tvp.gosky.utils.Messenger;
import ee.tvp.gosky.utils.SysInfo;

public class MainActivity extends Activity {

	final Context _context = this;
	final Messenger _messenger = new Messenger(_context);

	static final String TAG = MainActivity.class.getSimpleName();

	final Handler _handler = new Handler();

	SurfaceView _surfaceView = null;
	
	int _interval = 60;
	boolean _isTakingPictures = false;
	String _uploadScriptUrl = null;

	WifiManager _wifiManager = null;
	ConnectivityManager _connectivityManager = null;

	Cam _camera = null;
	ExternalStorage _storage = null;

	boolean _isHdr = false;
	
	// UI elements
	EditText _uploadUrlEditText = null;
	EditText _intervalSecondsEditText = null;
	ToggleButton _dataButton = null;
	ToggleButton _hdrButton = null;
	ToggleButton _wifiButton = null;
	ToggleButton _startStopButton = null;
	
	public Context getContext(){
		return _context;
	}
	
	public ExternalStorage getStorage(){
		return _storage;
	}
	
	public String getUploadScriptUrl(){
		return _uploadScriptUrl;
	}
	
	public SurfaceView getSurfaceView(){
		return _surfaceView;
	}
	
	@Override
	protected void onCreate(Bundle savedInstanceState) {

		super.onCreate(savedInstanceState);
		setContentView(R.layout.activity_main);
		
		_uploadUrlEditText = (EditText) findViewById(R.id.uploadUrl);
		_intervalSecondsEditText = (EditText) findViewById(R.id.intervalSeconds);
		_wifiButton = (ToggleButton) findViewById(R.id.toggleWifi);
		_dataButton = (ToggleButton) findViewById(R.id.toggleData);
		_hdrButton = (ToggleButton) findViewById(R.id.toggleHdr);
		_startStopButton = (ToggleButton) findViewById(R.id.startStop);
		_startStopButton.setEnabled(false);
		_startStopButton.setClickable(false);
		_surfaceView = (SurfaceView) findViewById(R.id.surfaceView1);
		_wifiManager = (WifiManager) getSystemService(Context.WIFI_SERVICE);
		_connectivityManager = (ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);
		
		prepareApplication();

	}
	@Override
	protected void onDestroy(){
		_camera.getInstance().release();
		super.onDestroy();
	}

	/**
	 * Checks device features and shows the message dialog with appropriate exit
	 * strategy (Exits when no camera is found)
	 */
	private void prepareApplication() {

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
			_isHdr = false;
			_messenger.notice(R.string.hdrUnavailable);
			_hdrButton.setClickable(false);
			_hdrButton.setEnabled(false);
		}
		
	}

	private boolean hasCamera() {
		return getPackageManager().hasSystemFeature(PackageManager.FEATURE_CAMERA) && Camera.getNumberOfCameras() > 0;
	}

	private boolean hasWifi() {
		return getPackageManager().hasSystemFeature(PackageManager.FEATURE_WIFI);
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

		if (!_isTakingPictures) {
			handlerRemoveCallbacks();
		} else {
			setData();
			handlerPostDelayed();
		}
	}

	private void setData(){
		_uploadScriptUrl = _uploadUrlEditText.getText().toString();

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

		_interval = Integer.parseInt(_intervalSecondsEditText.getText().toString());

		if (_interval == 0) {
			_interval = 60;
		}

		Log.d(TAG, "Upload script url set to: " + _uploadScriptUrl);
		Log.d(TAG, "Time interval set to: " + _interval);
		
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
	
	private Runnable mainOperation = new Runnable() {
		@Override
		public void run() {
			_camera.takePicture();
			monitor();
			handlerPostDelayed();
		}
	};

	private void handlerPostDelayed() {
		_handler.postDelayed(mainOperation, getIntervalInMillis());
	}

	private void handlerRemoveCallbacks() {
		_handler.removeCallbacks(mainOperation);
	}

	@SuppressLint("InlinedApi")
	private boolean hasHdr(){
		boolean hdr = false;
		if(_camera != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.JELLY_BEAN_MR1){
			if(_camera.getInstance() != null){
				Parameters parameters = _camera.getInstance().getParameters();
				hdr = parameters.getSupportedSceneModes().contains(Parameters.SCENE_MODE_HDR);
			}
		}
		return hdr;
	}

	public boolean isHdr() {
		return _isHdr;
	}

	public void setAppReady(boolean state) {		
		_startStopButton.setClickable(state);
		_startStopButton.setEnabled(state);	
		Log.d(TAG, "Setting app ready");
	}
	
}
